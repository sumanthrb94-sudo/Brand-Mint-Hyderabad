import os, glob
from PIL import Image
from rembg import remove, new_session
session = new_session("u2net_human_seg")
frames = sorted(glob.glob("./frames/f_*.png"))
for i, fp in enumerate(frames):
    out = f"./matte/{os.path.basename(fp).replace('f_','m_')}"
    if os.path.exists(out): continue
    img = Image.open(fp).convert("RGB")
    remove(img, session=session, only_mask=True, post_process_mask=True).save(out)
print("matte done")
