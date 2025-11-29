# Training Script Templates

This directory contains training script templates for different ML frameworks.

## PyTorch Template

**File**: `templates/pytorch_train.py`

### Usage:
```bash
python pytorch_train.py \
  --model-name "t5-base" \
  --train-data /path/to/train.json \
  --val-data /path/to/val.json \
  --output-dir /path/to/output \
  --config /path/to/config.json
```

### Config JSON Example:
```json
{
  "epochs": 10,
  "batch_size": 8,
  "learning_rate": 5e-5,
  "warmup_steps": 500,
  "max_length": 512,
  "logging_steps": 100,
  "save_steps": 1000,
  "eval_steps": 500,
  "fp16": false,
  "num_workers": 4
}
```

## TensorFlow Template

**File**: `templates/tensorflow_train.py`

### Usage:
```bash
python tensorflow_train.py \
  --train-data /path/to/train.json \
  --val-data /path/to/val.json \
  --output-dir /path/to/output \
  --config /path/to/config.json
```

### Config JSON Example:
```json
{
  "epochs": 10,
  "batch_size": 32,
  "learning_rate": 0.001,
  "vocab_size": 10000,
  "embedding_dim": 256,
  "hidden_units": 512,
  "early_stopping_patience": 3
}
```

## Training Data Format

Training data should be in JSON format with the following structure:

```json
[
  {
    "input": "Original AI-generated text...",
    "output": "Humanized version of the text...",
    "metadata": {
      "strategy": "auto",
      "level": 3,
      "quality_score": 85.5
    }
  }
]
```

Or JSONL format (one JSON object per line):
```jsonl
{"input": "...", "output": "...", "metadata": {...}}
{"input": "...", "output": "...", "metadata": {...}}
```

## Output

After training, the scripts will:
1. Save the trained model to the output directory
2. Save training metrics to `training_metrics.json`
3. Print metrics to stdout for the training pipeline to capture

