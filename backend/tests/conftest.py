import os

# Tests never load the real ML models: slow, and the weights may not exist on every machine.
os.environ["LOAD_MODELS"] = "false"
