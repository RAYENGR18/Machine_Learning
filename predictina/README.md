# Predictina — End-to-End House Price Prediction

Predictina is a production-style ML project that separates preprocessing, training, evaluation, serving, and frontend UI.

## Project Structure

```text
predictina/
├── data/
├── notebooks/
├── src/
│   ├── preprocessing.py
│   ├── train.py
│   ├── evaluate.py
│   └── utils.py
├── models/
├── mlruns/
├── api/
│   ├── main.py
│   ├── schema.py
│   └── model_loader.py
├── frontend/
├── requirements.txt
└── README.md
```

## 1) Install dependencies

```bash
cd predictina
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2) Train models + track with MLflow

From `predictina/`:

```bash
export MLFLOW_TRACKING_URI=file:./mlruns
python src/train.py --data-path data/house_pricing_raw.csv --experiment-name predictina-house-prices --model-name PredictinaHousePriceModel
```

What happens:
- Data cleaning and reusable feature engineering are applied.
- Models are trained and compared: RandomForest, XGBoost, LightGBM.
- Metrics logged: RMSE, MAE, R².
- Artifacts logged: feature importance and model comparison chart.
- Best model is registered and moved to `Production` stage.

## 3) Launch MLflow UI

```bash
mlflow ui --backend-store-uri ./mlruns --host 0.0.0.0 --port 5000
```

Open: `http://localhost:5000`

## 4) Start FastAPI backend

```bash
cd api
export MLFLOW_TRACKING_URI=file:../mlruns
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Prediction endpoint:

```http
POST /predict
Content-Type: application/json

{
  "surface": 120,
  "rooms": 3,
  "bathrooms": 2,
  "location": "Tunis"
}
```

## 5) Start React frontend

```bash
cd frontend
npm install
npm run dev
```

Set API URL if needed:

```bash
echo 'VITE_API_URL=http://localhost:8000' > .env
```

## Notes on consistency

- The same engineered features are used for training and inference.
- Preprocessing is handled through sklearn pipeline to avoid leakage.
- Inference model is loaded from MLflow Production stage.
