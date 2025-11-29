#!/usr/bin/env python3
"""
PyTorch Training Script Template
Generic template for training text humanization models with PyTorch
"""

import argparse
import json
import os
import sys
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from transformers import Trainer, TrainingArguments
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HumanizationDataset(Dataset):
    """Dataset for text humanization pairs"""
    
    def __init__(self, data_path: str, tokenizer, max_length: int = 512):
        self.tokenizer = tokenizer
        self.max_length = max_length
        
        # Load training data
        with open(data_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f) if data_path.endswith('.json') else [json.loads(line) for line in f]
        
        logger.info(f"Loaded {len(self.data)} training examples")
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        item = self.data[idx]
        original = item['input']
        humanized = item['output']
        
        # Tokenize inputs and targets
        inputs = self.tokenizer(
            original,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        targets = self.tokenizer(
            humanized,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        return {
            'input_ids': inputs['input_ids'].squeeze(),
            'attention_mask': inputs['attention_mask'].squeeze(),
            'labels': targets['input_ids'].squeeze(),
        }


def train_model(
    model_name: str,
    train_data_path: str,
    val_data_path: str,
    output_dir: str,
    config: dict,
):
    """Train a text humanization model"""
    
    logger.info(f"Starting training with config: {config}")
    
    # Load tokenizer and model
    logger.info(f"Loading model: {model_name}")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
    
    # Create datasets
    logger.info("Loading training data...")
    train_dataset = HumanizationDataset(train_data_path, tokenizer, config.get('max_length', 512))
    
    val_dataset = None
    if val_data_path and os.path.exists(val_data_path):
        logger.info("Loading validation data...")
        val_dataset = HumanizationDataset(val_data_path, tokenizer, config.get('max_length', 512))
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=config.get('epochs', 10),
        per_device_train_batch_size=config.get('batch_size', 8),
        per_device_eval_batch_size=config.get('batch_size', 8),
        learning_rate=config.get('learning_rate', 5e-5),
        warmup_steps=config.get('warmup_steps', 500),
        logging_dir=f"{output_dir}/logs",
        logging_steps=config.get('logging_steps', 100),
        save_steps=config.get('save_steps', 1000),
        eval_steps=config.get('eval_steps', 500) if val_dataset else None,
        evaluation_strategy='steps' if val_dataset else 'no',
        save_total_limit=config.get('save_total_limit', 3),
        load_best_model_at_end=True if val_dataset else False,
        metric_for_best_model='loss',
        greater_is_better=False,
        fp16=config.get('fp16', False),
        dataloader_num_workers=config.get('num_workers', 4),
        report_to='none',  # Disable wandb/tensorboard for now
    )
    
    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        tokenizer=tokenizer,
    )
    
    # Train
    logger.info("Starting training...")
    train_result = trainer.train()
    
    # Save final model
    logger.info(f"Saving model to {output_dir}")
    trainer.save_model()
    tokenizer.save_pretrained(output_dir)
    
    # Save training metrics
    metrics = {
        'train_loss': train_result.training_loss,
        'train_runtime': train_result.metrics.get('train_runtime', 0),
        'train_samples_per_second': train_result.metrics.get('train_samples_per_second', 0),
        'epoch': train_result.metrics.get('epoch', 0),
    }
    
    if val_dataset:
        eval_result = trainer.evaluate()
        metrics.update({
            'eval_loss': eval_result.get('eval_loss', 0),
        })
    
    # Save metrics
    metrics_path = os.path.join(output_dir, 'training_metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    
    logger.info(f"Training completed! Metrics: {metrics}")
    
    return metrics


def main():
    parser = argparse.ArgumentParser(description='Train text humanization model')
    parser.add_argument('--model-name', type=str, required=True, help='Base model name')
    parser.add_argument('--train-data', type=str, required=True, help='Training data path')
    parser.add_argument('--val-data', type=str, help='Validation data path')
    parser.add_argument('--output-dir', type=str, required=True, help='Output directory')
    parser.add_argument('--config', type=str, required=True, help='Training config JSON')
    
    args = parser.parse_args()
    
    # Load config
    with open(args.config, 'r') as f:
        config = json.load(f)
    
    # Train
    metrics = train_model(
        model_name=args.model_name,
        train_data_path=args.train_data,
        val_data_path=args.val_data,
        output_dir=args.output_dir,
        config=config,
    )
    
    # Print metrics for pipeline to capture
    print(f"METRICS: {json.dumps(metrics)}")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())

