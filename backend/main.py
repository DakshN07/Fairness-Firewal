import os
import json
import re
from fastapi import FastAPI, UploadFile, File, Request, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import polars as pl
import io
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Fairness Firewall API",
    description="Backend for the 2026 Google Solution Challenge: Fairness Firewall",
    version="1.0.0"
)

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Top-level client removed to prevent crash on empty API keys before rotation takes over
import time

def clean_json(text):
    text = re.sub(r'```json\n?', '', text)
    text = re.sub(r'```\n?', '', text)
    return text.strip()

def generate_with_fallback(prompt, custom_key=None):
    # Determine the pool of keys
    if custom_key:
        keys = [custom_key]
    else:
        keys = [
            os.getenv("KEY_1"),
            os.getenv("KEY_2"),
            os.getenv("KEY_3"),
            os.getenv("GEMINI_API_KEY"),
            os.getenv("GOOGLE_API_KEY")
        ]
        # Clean invalid or empty keys
        keys = [k for k in keys if k and "YOUR_" not in k and "AIzaSy" in k]
        # Remove duplicates while preserving order
        keys = list(dict.fromkeys(keys))
        
    if not keys:
        raise ValueError("No valid Gemini API keys found in environment or Authorization header.")

    last_error = None
    for key in keys:
        active_client = genai.Client(api_key=key)
        
        # 1. Try Gemini 2.0 Flash
        try:
            response = active_client.models.generate_content(
                model="gemini-2.0-flash", 
                contents=prompt
            )
            return response
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f"KEY {key[:10]}... hit 429 on 2.0-flash. Retrying with 1.5-flash...")
                
                # 2. Try Gemini 1.5 Flash (same key)
                try:
                    response = active_client.models.generate_content(
                        model="gemini-1.5-flash", 
                        contents=prompt
                    )
                    return response
                except Exception as e1_5:
                    if "429" in str(e1_5) or "RESOURCE_EXHAUSTED" in str(e1_5):
                        print(f"KEY {key[:10]}... hit 429 on 1.5-flash. Waiting 2 seconds before rotating key...")
                        time.sleep(2)
                        last_error = e1_5
                        continue # Move to next key
                    else:
                        print(f"KEY {key[:10]}... failed on 1.5-flash with error: {e1_5}. Rotating key...")
                        last_error = e1_5
                        continue
            else:
                print(f"KEY {key[:10]}... failed on 2.0-flash with error: {e}. Rotating key...")
                last_error = e
                continue
                
    # If all keys failed
    raise last_error

@app.get("/")
def read_root():
    return {"message": "Welcome to the Fairness Firewall API"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/analyze-bias")
async def analyze_bias(request: Request, file: UploadFile = File(None), dataset_url: str = Form(None), exempted_columns: str = Form(None)):
    small_dataset = False
    sparse_subgroups = False
    try:
        if dataset_url:
            df = pl.read_csv(dataset_url)
        elif file:
            df = pl.read_csv(io.BytesIO(await file.read()))
        else:
            raise ValueError("Must provide either file or dataset_url")
            
        headers = df.columns
        sample = df.head(5).to_pandas().to_json()
        
        total_rows = len(df)
        small_dataset = total_rows < 300

        # Check for dynamic API key from frontend
        auth_header = request.headers.get("Authorization")
        custom_key = None
        if auth_header and auth_header.startswith("Bearer "):
            custom_key = auth_header.split(" ")[1]

        # STEP 1: Gemma 4 identifies the schema dynamically
        schema_prompt = f"""
        Identify the roles of these columns for a fairness audit.
        Columns: {headers}
        Sample: {sample}
        Also determine if the target column relates to a high-risk prediction category (e.g., recidivism, creditworthiness, employability, insurance risk, parole eligibility).
        Return ONLY a JSON with keys: "protected_columns", "target_column", "neutral_columns", "is_high_risk_objective" (boolean).
        """
        # Using the rotation framework
        schema_res = generate_with_fallback(schema_prompt, custom_key=custom_key)
        schema = json.loads(clean_json(schema_res.text))

        target = schema.get('target_column', headers[-1])
        protected_list = schema.get('protected_columns', [])
        is_high_risk = schema.get('is_high_risk_objective', False)

        if exempted_columns:
            exempted_list = [x.strip() for x in exempted_columns.split(",")]
            protected_list = [col for col in protected_list if col not in exempted_list]
        else:
            exempted_list = []

        # STEP 2: Loop through every protected column and run the Math Matrix
        report = []
        max_spd = 0.0
        for col in protected_list:
            if col not in df.columns or target not in df.columns:
                continue
                
            # Check subgroup sizes
            col_counts = df.get_column(col).value_counts()
            if col_counts["count"].min() < 30:
                sparse_subgroups = True
                
            try:
                # Calculate SPD (Statistical Parity Difference)
                rates = (
                    df.with_columns(pl.col(target).cast(pl.Float64, strict=False))
                    .group_by(col)
                    .agg(pl.col(target).mean())
                )
                spd = float(rates.get_column(target).max() - rates.get_column(target).min())
                if pd.isna(spd) or spd is None: spd = 0.0
            except:
                spd = 0.0

            max_spd = max(max_spd, spd)
            
            # Calculate Representation Skew
            total_count = len(df)
            counts = df.get_column(col).value_counts()
            underrepresented = counts.filter(pl.col("count") / total_count < 0.1).get_column(col).to_list()

            report.append({
                "attribute": col,
                "spd_score": spd,
                "is_biased": spd > 0.1,
                "minority_groups": underrepresented
            })

        # STEP 3: Final Reasoning for PPT
        final_prompt = f"Explain these Statistical Parity Difference scores to an executive: {report}. Format it beautifully in Markdown."
        if exempted_list:
            final_prompt += f"\n\nNote: The user explicitly exempted the following columns due to legal or policy reasons: {exempted_list}. Explicitly list them in the report under an 'Excluded — Legal or Policy Exemption' heading."
        if is_high_risk:
            final_prompt += f"\n\nBegin your report with a '### 🚨 High-Risk Objective Warning' section stating: 'Predicting {target} from historical data may encode systemic injustices regardless of dataset balance. Consider whether this prediction objective should exist before proceeding to model training.'"
        final_prompt += "\n\nIf multiple protected attributes show high SPD scores (>0.1), analyze the data for potential 'Fairness Tension' (i.e., if mitigating bias for one group might negatively impact another). If tension exists, create a distinct section titled '### ⚖️ Fairness Tension Alert' that names the conflicting groups, explains the trade-off, and concludes exactly with: 'Resolving this tension requires policy and legal review beyond automated auditing.'"

        response = generate_with_fallback(final_prompt, custom_key=custom_key)
        ai_reasoning = response.text
        math_score = max_spd

    except Exception as e:
        import traceback
        with open("error_log.txt", "w") as f:
            f.write(traceback.format_exc())
        print(f"CRITICAL API ERROR (Analysis): {e}")
        math_score = 0.45
        ai_reasoning = f"> ⚠️ **Notice: Live AI API Unavailable.**\n> *The backend encountered an error: `{e}`. Displaying a localized simulation for your demonstration.* \n\n---\n\n### Executive Audit Report (Simulated)\n\n**Dataset Overview:**\n- **Target Column**: `hired`\n- **Protected Columns**: `zip_code`, `gender`\n\n**Findings:**\nThe Statistical Parity Difference (SPD) score peaked at **0.45** for the `zip_code` attribute. This indicates a significant disparity across different demographic regions (often an indicator of historical redlining). Any SPD score over 0.10 is considered highly biased and requires mitigation."

    return {
        "math_score": math_score,
        "ai_reasoning": ai_reasoning,
        "small_dataset": small_dataset,
        "sparse_subgroups": sparse_subgroups
    }

@app.post("/api/mitigate")
async def mitigate_bias(request: Request, file: UploadFile = File(None), dataset_url: str = Form(None)):
    if dataset_url:
        df = pl.read_csv(dataset_url)
    elif file:
        df = pl.read_csv(io.BytesIO(await file.read()))
    else:
        raise ValueError("Must provide either file or dataset_url")
        
    headers = df.columns
    
    auth_header = request.headers.get("Authorization")
    custom_key = None
    if auth_header and auth_header.startswith("Bearer "):
        custom_key = auth_header.split(" ")[1]

    prompt = f"""
    Based on the dataset with columns {headers}, suggest concrete mitigation strategies 
    to remove hidden proxies and improve fairness. Explain how to synthetically re-balance the data.
    Format your response in Markdown.
    """
    try:
        res = generate_with_fallback(prompt, custom_key=custom_key)
        suggestion = res.text
    except Exception as e:
        print(f"CRITICAL API ERROR (Mitigation): {e}")
        suggestion = "> ⚠️ **Notice: Live AI API Unavailable.**\n> *Displaying a localized mitigation strategy for your demonstration.*\n\n---\n\n### Mitigation Strategy (Simulated)\n\n1. **Isolate Proxies**: Automatically drop the `zip_code` and `name` columns from the pipeline, as they carry heavy historical bias weights.\n2. **Synthetic Re-balancing**: Implement SMOTE (Synthetic Minority Over-sampling Technique) to algorithmically generate synthetic records for underrepresented demographic groups before training the final model."

    return {
        "mitigation_suggestion": suggestion
    }
