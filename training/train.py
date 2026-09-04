"""Minimal LoRA fine-tuning entry point for Ai2 chat data.

Install (example):
  pip install torch transformers datasets peft accelerate
Then run:
  python train.py --config config.example.json

Use a GPU for practical training. This script is intentionally small so the
model, tokenizer and hyperparameters can be changed without changing Ai2.
"""
import argparse, json
from pathlib import Path

from datasets import load_dataset
from peft import LoraConfig, TaskType, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments


def load_config(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def format_messages(tokenizer, messages):
    return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.example.json")
    args = ap.parse_args()
    cfg = load_config(args.config)

    tokenizer = AutoTokenizer.from_pretrained(cfg["base_model"], use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    ds = load_dataset("json", data_files={"train": cfg["train_file"], "validation": cfg["valid_file"]})
    def prepare(row):
        text = format_messages(tokenizer, row["messages"])
        enc = tokenizer(text, truncation=True, max_length=cfg["max_seq_length"])
        enc["labels"] = enc["input_ids"].copy()
        return enc
    tokenized = ds.map(prepare, remove_columns=ds["train"].column_names)

    model = AutoModelForCausalLM.from_pretrained(cfg["base_model"], torch_dtype="auto")
    lora = LoraConfig(
        r=cfg["lora_rank"],
        lora_alpha=cfg["lora_alpha"],
        lora_dropout=cfg["lora_dropout"],
        task_type=TaskType.CAUSAL_LM,
        target_modules="all-linear",
    )
    model = get_peft_model(model, lora)
    model.print_trainable_parameters()

    training = TrainingArguments(
        output_dir=cfg["output_dir"],
        num_train_epochs=cfg["epochs"],
        learning_rate=cfg["learning_rate"],
        per_device_train_batch_size=1,
        per_device_eval_batch_size=1,
        gradient_accumulation_steps=8,
        logging_steps=5,
        eval_strategy="epoch",
        save_strategy="epoch",
        report_to="none",
        fp16=False,
        bf16=False,
    )
    trainer = Trainer(model=model, args=training, train_dataset=tokenized["train"], eval_dataset=tokenized["validation"], tokenizer=tokenizer)
    trainer.train()
    trainer.save_model(cfg["output_dir"])
    tokenizer.save_pretrained(cfg["output_dir"])
    print(f"Saved Ai2 adapter/model to {cfg['output_dir']}")


if __name__ == "__main__":
    main()
