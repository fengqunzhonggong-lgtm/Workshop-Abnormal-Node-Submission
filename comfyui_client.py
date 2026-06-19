import json
import uuid
import random
import urllib.request
import urllib.parse
import websocket
import os

COMFYUI_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def queue_prompt(prompt_workflow, client_id):
    """提交工作流到 ComfyUI"""
    data = json.dumps({"prompt": prompt_workflow, "client_id": client_id}).encode("utf-8")
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def get_history(prompt_id):
    """获取已完成的生成历史"""
    with urllib.request.urlopen(f"{COMFYUI_URL}/history/{prompt_id}") as resp:
        return json.loads(resp.read())


def get_outputs(node_outputs):
    """从节点输出中下载图片"""
    saved = []
    for node_id, outputs in node_outputs.items():
        for filename in outputs.get("images", []):
            name = filename["filename"]
            subfolder = filename.get("subfolder", "")
            url = f"{COMFYUI_URL}/view?filename={urllib.parse.quote(name)}&subfolder={subfolder}&type=output"
            save_path = os.path.join(OUTPUT_DIR, name)
            urllib.request.urlretrieve(url, save_path)
            saved.append(save_path)
            print(f"  saved: {save_path}")
    return saved


def wait_for_prompt(prompt_id, client_id):
    """通过 WebSocket 等待生成完成"""
    ws = websocket.WebSocket()
    ws.connect(f"ws://127.0.0.1:8188/ws?clientId={client_id}")
    while True:
        msg = json.loads(ws.recv())
        if msg["type"] == "executing" and msg["data"]["prompt_id"] == prompt_id:
            if msg["data"].get("node") is None:
                ws.close()
                break
    ws.close()


def make_txt2img_workflow(prompt, negative_prompt="", checkpoint="v1-5-pruned-emaonly.safetensors"):
    """构建 Hires Fix 文生图工作流（低分辨率生成 → 2x放大 → 细化）"""
    seed = random.randint(0, 2**31 - 1)
    return {
        # 第一阶段: 低分辨率生成 (768x512)
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": 25,
                "cfg": 7.5,
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                "denoise": 1,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0],
            },
        },
        # 第二阶段: 放大后细化
        "11": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": 20,
                "cfg": 7,
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                "denoise": 0.6,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["10", 0],
            },
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": checkpoint},
        },
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {"width": 768, "height": 512, "batch_size": 1},
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": prompt, "clip": ["4", 1]},
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": negative_prompt, "clip": ["4", 1]},
        },
        "10": {
            "class_type": "LatentUpscale",
            "inputs": {
                "samples": ["3", 0],
                "upscale_method": "bilinear",
                "width": 1536,
                "height": 1024,
                "crop": "disabled",
            },
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["11", 0], "vae": ["4", 2]},
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {"filename_prefix": "ComfyUI", "images": ["8", 0]},
        },
    }


if __name__ == "__main__":
    prompt = input("Prompt: ")
    negative = input("Negative (optional): ")

    client_id = str(uuid.uuid4())
    workflow = make_txt2img_workflow(prompt, negative)
    print(f"\nSubmitting workflow...")
    result = queue_prompt(workflow, client_id)
    prompt_id = result["prompt_id"]
    print(f"Prompt ID: {prompt_id}")

    print("Waiting...", end="", flush=True)
    wait_for_prompt(prompt_id, client_id)
    print(" done!")

    history = get_history(prompt_id)
    outputs = history[prompt_id].get("outputs", {})
    get_outputs(outputs)
