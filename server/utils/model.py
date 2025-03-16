import sys
from transformers import pipeline

try:
    text = sys.argv[1]
    gen = pipeline("token-classification", "lakshyakh93/deberta_finetuned_pii", device=-1)
    output = gen(text, aggregation_strategy="first")
    
    if not output:
        print("No entities detected.")
    else:
        output_dict = {}
        for item in output:
            output_dict[item['word']] = {
                'entity_group': item['entity_group'],
                'score': item['score'],
                'start_index' : item['start'],
                'end_index' : item['end']
            }
        print(output_dict)

except Exception as e:
    print(f"Error occurred: {e}")
