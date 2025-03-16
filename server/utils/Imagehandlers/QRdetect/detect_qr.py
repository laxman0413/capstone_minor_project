import sys
import json
import os
from ultralytics import YOLO

def detect_pii(image_path):
    model_path = os.path.join(os.path.dirname(__file__), "qr.pt")

    if not os.path.exists(model_path):
        print(json.dumps({"error": "Model file not found"}))
        sys.exit(1)

    model = YOLO(model_path)
    results = model.predict(image_path, conf=0.5)

    pii_boxes = []
    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

            pii_boxes.append({
                "pattern": "QR",
                "text": "QR",
                "location": {
                    "Left": x1,
                    "Top": y1,
                    "Width": x2 - x1,
                    "Height": y2 - y1
                }
            })

    output_data = {"masked_pii": pii_boxes}

    # Save to JSON file
    output_path = os.path.join(os.path.dirname(__file__), "output.json")
    with open(output_path, "w") as json_file:
        json.dump(output_data, json_file, indent=4)

    return output_path

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Please provide an image path"}))
        sys.exit(1)

    image_path = sys.argv[1]

    if not os.path.exists(image_path):
        print(json.dumps({"error": "Image file not found"}))
        sys.exit(1)

    try:
        json_path = detect_pii(image_path)
        print(json.dumps({"status": "success", "output_file": json_path}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)



# Results
'''
fitness: 0.6029114608812658
keys: ['metrics/precision(B)', 'metrics/recall(B)', 'metrics/mAP50(B)', 'metrics/mAP50-95(B)']
maps: array([    0.56912])
names: {0: 'barcode'}
plot: True
results_dict: {'metrics/precision(B)': 0.848065980744824, 'metrics/recall(B)': 0.8187088421755089, 'metrics/mAP50(B)': 0.9070285564520736, 'metrics/mAP50-95(B)': 0.5691206724845093, 'fitness': 0.6029114608812658}
save_dir: PosixPath('/content/runs/train')
speed: {'preprocess': 0.22452327083044565, 'inference': 2.289353687496979, 'loss': 0.0005078541676084569, 'postprocess': 2.010437624998455}
task: 'detect'
'''