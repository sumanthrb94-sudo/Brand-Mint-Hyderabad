import glob, os, sys
import numpy as np
from PIL import Image
W,H=720,1280
def load_rgba(p): return np.array(Image.open(p).convert("RGBA")).astype(np.float32)
def over(dst,src):
    a=src[:,:,3:4]/255.0
    return dst*(1-a)+src[:,:,:3]*a
def grade(rgb):
    img=rgb/255.0
    img[:,:,1]=np.clip(img[:,:,1]*1.06,0,1)
    dark=img.mean(axis=2)<0.32
    img[dark,0]=np.clip(img[dark,0]*1.04,0,1)
    img[dark,2]=np.clip(img[dark,2]*0.97,0,1)
    img=np.power(img,0.97)
    return np.clip(img*255,0,255)
def main():
    frames=sorted(glob.glob("./frames/f_*.png"))
    for i in range(1,len(frames)+1):
        bg=np.array(Image.open(f"./frames/f_{i:04d}.png").convert("RGB")).astype(np.float32)
        matte=np.array(Image.open(f"./matte/m_{i:04d}.png").convert("L")).astype(np.float32)/255.0
        back=load_rgba(f"./cap_back/c_{i:04d}.png"); front=load_rgba(f"./cap_front/c_{i:04d}.png")
        a=back[:,:,3:4]/255.0; vis=a*(1-matte[:,:,None])
        comp=bg*(1-vis)+back[:,:,:3]*vis
        comp=over(comp,front)
        comp=grade(comp)  # no zoom — locked steady
        Image.fromarray(comp.astype(np.uint8)).save(f"./out/o_{i:04d}.png")
    print("composite done")
if __name__=="__main__": main()
