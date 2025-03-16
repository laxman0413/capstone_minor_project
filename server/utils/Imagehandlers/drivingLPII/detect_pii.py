import sys
import json
import os
from ultralytics import YOLO

def detect_pii(image_path):
    model_path = os.path.join(os.path.dirname(__file__), "dl3.pt")

    if not os.path.exists(model_path):
        print(json.dumps({"error": "Model file not found"}))
        sys.exit(1)

    model = YOLO(model_path)
    results = model.predict(image_path, conf=0.5)

    class_names = [
       'add', 'blood_group', 'dl_no','dob', 'name', 'relation_with', 'rto','state', 'vehicle_type'
    ]

    # Define PII fields that need to be masked
    pii_classes = {'add', 'blood_group', 'dl_no','dob', 'name', 'relation_with', 'rto','state', 'vehicle_type'}

    pii_boxes = []
    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0].item())
            class_name = class_names[class_id]

            if class_name in pii_classes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

                pii_boxes.append({
                    "pattern": class_name,
                    "text": class_name,
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
