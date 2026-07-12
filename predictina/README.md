# Predictina — Smart Full-Stack House Price Prediction

Predictina is a full-stack Machine Learning application for house price prediction. It is designed to be **production-ready**, **flexible for end users**, and **consistent between training and inference**.

The project now uses a richer feature set, robust missing value handling, model comparison (RandomForest, XGBoost, LightGBM), and MLflow model tracking/registry.

---

## 📌 What Predictina does

Predictina predicts Tunisian house prices while handling partial user inputs intelligently.

### Key capabilities
- Uses core and contextual features:
  - `surface`, `rooms`, `bathrooms`, `location`, `city`, `property_type`, `floor`, `total_floors`, `parking`, `has_garden`, `has_pool`, `year_built`
- Automatically handles missing data:
  - Numerical: skew-aware imputation (mean/median)
  - Categorical: most frequent / `unknown`
  - Boolean: defaults to `False`
  - Correlation logic: infers values like bathrooms from rooms
- Ensures strict train/serve consistency using one sklearn pipeline
- Exposes predictions through FastAPI and a React frontend

---

## 🗂️ Project structure

```text
predictina/
│
├── src/
│   ├── preprocessing.py
│   ├── train.py
│   ├── pipeline.py
│   ├── evaluate.py
│   └── utils.py
│
├── api/
│   ├── main.py
│   ├── model_loader.py
│   └── schema.py
│
├── models/
├── mlruns/
├── frontend/
├── data/
├── notebooks/
├── requirements.txt
└── README.md
```

---

## ⚙️ Installation

```bash
cd predictina
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## 🧠 Training

Train and compare models with MLflow tracking:

```bash
cd predictina
python src/train.py \
  --data-path data/house_pricing_raw.csv \
  --experiment-name predictina-house-prices \
  --model-name PredictinaHousePriceModel
```

### During training
- Data cleaning + location/city extraction + region grouping
- Feature engineering and smart imputation in a reusable pipeline
- Model comparison:
  - RandomForest
  - XGBoost
  - LightGBM
- Metrics logged:
  - RMSE
  - MAE
  - R²
- Artifacts logged:
  - Feature importance plot
  - Model comparison chart
- Best model is registered and promoted to **Production**

---

## 📊 MLflow

Launch the MLflow UI:

```bash
cd predictina
mlflow ui --backend-store-uri sqlite:///mlflow.db --host 0.0.0.0 --port 5000
```

Open: http://localhost:5000

Use MLflow to inspect:
- Parameters and hyperparameters
- Metrics per model candidate
- Artifacts (plots, CSV scores)
- Registered model versions

---

## 🚀 FastAPI backend

Start API server:

```bash
cd predictina/api
export MLFLOW_TRACKING_URI=file:../mlruns
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Health endpoint
```http
GET /health
```

### Prediction endpoint
```http
POST /predict
Content-Type: application/json
```

#### Flexible request example (minimal input)
```json
{
  "surface": 120,
  "rooms": 3,
  "location": "Tunis"
}
```

#### Rich request example
```json
{
  "surface": 190,
  "rooms": 5,
  "bathrooms": 2,
  "location": "La Marsa",
  "city": "Tunis",
  "property_type": "villa",
  "floor": 1,
  "total_floors": 2,
  "parking": true,
  "has_garden": true,
  "has_pool": false,
  "year_built": 2015
}
```

#### Response format
```json
{
  "predicted_price": 250000
}
```

---

## 💻 Frontend (React)

```bash
cd predictina/frontend
npm install
npm run dev
```

Optional API URL config:

```bash
echo 'VITE_API_URL=http://localhost:8000' > .env
```

---

## 🔁 Full pipeline (end-to-end)

1. User submits partial house features in frontend.
2. Frontend calls FastAPI `/predict`.
3. API loads the registered MLflow Production model.
4. The same sklearn pipeline used in training is applied at inference:
   - feature building
   - intelligent missing value handling
   - encoding/scaling
5. Model returns `predicted_price`.

---

## ✅ Notes on production readiness

- Shared train/inference pipeline (no duplicated preprocessing logic)
- Robust handling of optional API fields
- Consistent feature schema
- MLflow tracking + model registry
- Logging in training and API services
