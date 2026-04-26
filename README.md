<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield-check.svg" alt="Fairness Firewall Logo" width="120" height="120" />
  <h1>Fairness Firewall</h1>
  <p><b>Schema-Agnostic Bias Detection & AI Mitigation Platform</b></p>
  <p><i>Built for the 2026 Google Solution Challenge</i></p>
</div>

---

## 🌟 Overview
**Fairness Firewall** is an enterprise-grade AI auditing tool designed to automatically detect, analyze, and mitigate systemic biases in any tabular dataset. Built specifically for the 2026 Google Solution Challenge, it leverages the raw mathematical power of Pandas combined with the deep reasoning capabilities of Google GenAI to eliminate "hidden proxies" (like zip codes or names) that inadvertently cause algorithmic discrimination.

## ✨ Key Features
- **Schema-Agnostic Auditing**: Upload *any* CSV. The system uses GenAI to dynamically parse the headers, isolate the **Target Variable**, and flag potential **Protected Attributes** automatically.
- **Statistical Parity Matrix**: Natively calculates the Statistical Parity Difference (SPD) score across all detected subgroups to mathematically prove or disprove disparate impact.
- **AI Deep Analysis**: Generates an "Executive Audit Report", using Google's generative models to explain *why* certain variables act as proxies and how they correlate to historical biases (like geographic redlining).
- **Heavenly Mitigation Strategies**: If the SPD score breaches the 0.10 fairness threshold, the system provides concrete, dataset-specific AI strategies (e.g., SMOTE synthetic re-balancing) to safely sanitize the data.
- **Bulletproof Demo Architecture**: Built-in graceful degradation. If API rate limits are hit during a live pitch, the backend seamlessly fails over to a localized simulation to keep your UI fully functional.
- **Antigravity UI/UX**: A highly polished, smooth Glassmorphism Next.js dashboard featuring live cursor spotlights, dynamic progress tracking, and interactive API key injection.

## 🛠️ Technology Stack
- **Frontend**: Next.js (App Router), Tailwind CSS v4, Lucide React, React-Markdown.
- **Backend**: FastAPI, Pandas, Uvicorn, Python.
- **AI/ML**: Official 2026 `google-genai` SDK (Gemma 4 / Gemini 2.0 Flash).

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/DakshN07/Fairness-Firewall.git
cd Fairness-Firewall
```

### 2. Backend Setup (FastAPI)
Navigate to the backend directory, set up your Python environment, and install the dependencies.
```bash
cd backend
python -m venv .venv
# Activate venv:
# Windows: .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate

pip install -r requirements.txt
```
Create a `.env` file in the `backend/` directory and add your Google AI Studio key:
```env
GOOGLE_API_KEY="your_api_key_here"
```
Run the backend server:
```bash
uvicorn main:app --reload
```

### 3. Frontend Setup (Next.js)
Open a new terminal and navigate to the frontend directory.
```bash
cd frontend
npm install
npm run dev
```

### 4. Access the Dashboard
Open your browser and navigate to `http://localhost:3000`. You can upload the included `test_bias.csv` file to immediately see the bias detection in action!

---

## ☁️ Deployment

### Deploying the Backend to Google Cloud Run
The FastAPI backend is fully compatible with Google Cloud Run.
1. Make sure you have the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated.
2. Navigate to the `backend/` directory.
3. Deploy directly using source code:
   ```bash
   gcloud run deploy fairness-firewall-backend --source . --port 8000 --allow-unauthenticated
   ```
4. Note the provided service URL.

### Deploying the Frontend to Vercel
The Next.js frontend is optimized for deployment on Vercel.
1. Push your code to a GitHub repository.
2. Go to your [Vercel Dashboard](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository and set the **Root Directory** to `frontend`.
4. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_API_URL`: Set this to your deployed Cloud Run backend URL (e.g., `https://fairness-firewall-backend-xyz.run.app/api`).
5. Click **Deploy**.

*Note: The user-injected API key flow works seamlessly across deployments. The backend is configured to accept cross-origin `Authorization` headers securely.*

---

## 🔐 API Key Configuration
You can securely inject your own Google AI Studio API key directly from the frontend dashboard by clicking the **Connect API** button. The key is securely saved to your browser's local storage and used specifically for your session's backend HTTP requests.

## 🤝 Open Innovation & The Four-Fifths Rule
This project mathematically enforces the **Four-Fifths Rule** (Disparate Impact) and monitors **Statistical Parity Differences** to ensure AI models deployed in sensitive areas (like hiring, lending, or law enforcement) treat all demographic groups with baseline fairness.
