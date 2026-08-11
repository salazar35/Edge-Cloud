import json
import requests

# 1. Cấu hình Endpoint và Token
API_URL = "https://api.modelverse.cn/v1/images/generations"  # Thay bằng endpoint Astraflow của bạn
API_TOKEN = "zEjbxX8MSiHtN5YY1bCa8c1b-a7b0-494d-89e3-43FcA68a"  # Thay API Token của bạn vào đây

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json",
}

# 2. Định nghĩa Prompt UI Mockup
prompt = (
    "Tạo hình ảnh giao diện quản trị workload tại biên. "
    "Hình ảnh bao gồm bảng điều khiển bên phải, với menu dạng cây có thể đóng mở,"
    "four stat summary cards at the top, and a large analytics chart in the main area. "
    "High fidelity, minimalist UI/UX design, Figma style."
)

# 3. Payload chứa tham số MODEL
payload = {
    # Khai báo model tạo ảnh của Astraflow
    # Ví dụ các model phổ biến: "flux-1-dev", "flux-1-schnell", "sdxl", "dall-e-3"
    "model": "Qwen/Qwen-Image",  # <--- Bổ sung tham số model tại đây
    "prompt": prompt,
    "n": 1,
    "size": "1920x1080",
    # "image": "https://umodelverse-inference.cn-wlcb.ufileos.com/ucloud-maxcot.jpg",
    # "quality": "hd",               # (Tùy chọn) Một số model hỗ trợ chọn chất lượng
    # "response_format": "url"       # Hoặc "b64_json" nếu muốn nhận dữ liệu Base64
}

# 4. Gửi Request
try:
  response = requests.post(API_URL, headers=headers, json=payload)

  if response.status_code == 200:
    data = response.json()

    # Xử lý kết quả trả về
    if "data" in data and len(data["data"]) > 0:
      image_url = data["data"][0].get("url")
      print(f"✅ Đã tạo ảnh mockup thành công với model '{payload['model']}':")
      print(image_url)
    else:
      print("⚠️ Response không chứa dữ liệu ảnh:", data)
  else:
    print(f"❌ Lỗi API ({response.status_code}): {response.text}")

except Exception as e:
  print(f"❌ Lỗi kết nối: {str(e)}")