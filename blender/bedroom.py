"""
저녁 분위기의 침실 (Blender Python)
=====================================
구성: 침대 · 이불 · 조명(협탁 스탠드 2개) · 창문(노을) + 커튼, 러그, 액자

실행 방법
  1) 블렌더:   blender -b -P bedroom.py -- --out bedroom.png
  2) 파이썬:   pip install bpy  &&  python3 bedroom.py --out bedroom.png
  3) 블렌더 GUI: Scripting 탭에 붙여넣고 ▶ 실행 (렌더 없이 장면만 만들려면 --no-render)

옵션: --res 1920 1200  --samples 200  --blend bedroom.blend
"""
import argparse
import math
import random
import sys

import bpy  # bpy를 먼저 불러와야 bmesh/mathutils를 쓸 수 있음
import bmesh
from mathutils import Vector, noise

# ───────────────────────── 0. 옵션 ─────────────────────────
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument("--out", default="bedroom.png")
ap.add_argument("--res", nargs=2, type=int, default=[1920, 1200])
ap.add_argument("--samples", type=int, default=200)
ap.add_argument("--blend", default="")
ap.add_argument("--no-render", action="store_true")
args, _ = ap.parse_known_args(argv)

random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection

# 방 치수 (m) : x=좌우, y=앞뒤(+y가 침대 머리쪽 벽), z=높이
RX, RY, RZ = 2.5, 2.3, 2.7          # 방 반폭 / 반깊이 / 천장 높이
WT = 0.15                           # 벽 두께
BX = -0.3                           # 침대 중심 x
BED_W, BED_HEAD_Y, BED_FOOT_Y = 1.6, 2.18, 0.18
MAT_TOP = 0.60                      # 매트리스 윗면 높이
WIN_Y0, WIN_Y1, WIN_Z0, WIN_Z1 = -0.9, 0.9, 0.9, 2.25   # 왼쪽 벽 창문


# ───────────────────────── 1. 재질 도우미 ─────────────────────────
def new_mat(name):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    m.node_tree.nodes.clear()
    return m, m.node_tree.nodes, m.node_tree.links


def principled(name, color, rough=0.5, metallic=0.0, bump_scale=0.0, bump_strength=0.15,
               sheen=0.0):
    m, n, l = new_mat(name)
    out = n.new("ShaderNodeOutputMaterial")
    b = n.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metallic
    if sheen:
        b.inputs["Sheen Weight"].default_value = sheen
    l.new(b.outputs["BSDF"], out.inputs["Surface"])
    if bump_scale:
        tc = n.new("ShaderNodeTexCoord")
        nz = n.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = bump_scale
        nz.inputs["Detail"].default_value = 4
        bp = n.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = bump_strength
        l.new(tc.outputs["Object"], nz.inputs["Vector"])
        l.new(nz.outputs["Fac"], bp.inputs["Height"])
        l.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def floor_material():
    m, n, l = new_mat("WoodFloor")
    out = n.new("ShaderNodeOutputMaterial")
    b = n.new("ShaderNodeBsdfPrincipled")
    tc = n.new("ShaderNodeTexCoord")
    br = n.new("ShaderNodeTexBrick")
    br.offset = 0.5
    br.inputs["Color1"].default_value = (0.30, 0.17, 0.085, 1)
    br.inputs["Color2"].default_value = (0.22, 0.12, 0.06, 1)
    br.inputs["Mortar"].default_value = (0.05, 0.03, 0.02, 1)
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.003
    br.inputs["Brick Width"].default_value = 1.3
    br.inputs["Row Height"].default_value = 0.14
    bp = n.new("ShaderNodeBump")
    bp.invert = True
    bp.inputs["Strength"].default_value = 0.4
    l.new(tc.outputs["Object"], br.inputs["Vector"])
    l.new(br.outputs["Color"], b.inputs["Base Color"])
    l.new(br.outputs["Fac"], bp.inputs["Height"])
    l.new(bp.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.35
    l.new(b.outputs["BSDF"], out.inputs["Surface"])
    return m


def shade_material():
    """전등갓: 빛이 은은하게 비치는 천"""
    m, n, l = new_mat("LampShade")
    out = n.new("ShaderNodeOutputMaterial")
    d = n.new("ShaderNodeBsdfDiffuse")
    t = n.new("ShaderNodeBsdfTranslucent")
    mix = n.new("ShaderNodeMixShader")
    em = n.new("ShaderNodeEmission")
    add = n.new("ShaderNodeAddShader")
    for s in (d, t):
        s.inputs["Color"].default_value = (0.80, 0.52, 0.28, 1)
    mix.inputs[0].default_value = 0.45
    em.inputs["Color"].default_value = (1.0, 0.55, 0.22, 1)
    em.inputs["Strength"].default_value = 0.15
    l.new(d.outputs[0], mix.inputs[1])
    l.new(t.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], add.inputs[0])
    l.new(em.outputs[0], add.inputs[1])
    l.new(add.outputs[0], out.inputs["Surface"])
    return m


def curtain_material():
    m, n, l = new_mat("Curtain")
    out = n.new("ShaderNodeOutputMaterial")
    d = n.new("ShaderNodeBsdfDiffuse")
    t = n.new("ShaderNodeBsdfTranslucent")
    mix = n.new("ShaderNodeMixShader")
    d.inputs["Color"].default_value = (0.80, 0.74, 0.66, 1)
    t.inputs["Color"].default_value = (0.80, 0.70, 0.58, 1)
    mix.inputs[0].default_value = 0.35
    l.new(d.outputs[0], mix.inputs[1])
    l.new(t.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], out.inputs["Surface"])
    return m


def art_material(name, colors, scale=2.5):
    m, n, l = new_mat(name)
    out = n.new("ShaderNodeOutputMaterial")
    b = n.new("ShaderNodeBsdfPrincipled")
    tc = n.new("ShaderNodeTexCoord")
    nz = n.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = scale
    nz.inputs["Detail"].default_value = 0.0
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.0, (*colors[0], 1)
    els[1].position, els[1].color = 0.45, (*colors[1], 1)
    for i, c in enumerate(colors[2:]):
        e = els.new(0.55 + 0.1 * i)
        e.color = (*c, 1)
    l.new(tc.outputs["Object"], nz.inputs["Vector"])
    l.new(nz.outputs["Fac"], ramp.inputs["Fac"])
    l.new(ramp.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.8
    l.new(b.outputs["BSDF"], out.inputs["Surface"])
    return m


M_WALL = principled("Wall", (0.72, 0.66, 0.58), 0.9, bump_scale=60, bump_strength=0.03)
M_CEIL = principled("Ceiling", (0.80, 0.78, 0.74), 0.9)
M_FLOOR = floor_material()
M_TRIM = principled("Trim", (0.85, 0.83, 0.78), 0.5)
M_WOOD = principled("Walnut", (0.16, 0.085, 0.045), 0.45, bump_scale=30, bump_strength=0.05)
M_HEAD = principled("HeadboardFabric", (0.10, 0.16, 0.17), 0.9, bump_scale=500, sheen=0.4)
M_SHEET = principled("Sheet", (0.86, 0.84, 0.80), 0.85, bump_scale=300, bump_strength=0.1)
M_DUVET = principled("Duvet", (0.82, 0.78, 0.70), 0.9, bump_scale=350, bump_strength=0.12, sheen=0.3)
M_FOLD = principled("DuvetFold", (0.62, 0.52, 0.42), 0.9, bump_scale=350, bump_strength=0.12, sheen=0.3)
M_THROW = principled("Throw", (0.50, 0.17, 0.08), 0.95, bump_scale=200, bump_strength=0.4, sheen=0.5)
M_PILLOW = principled("Pillow", (0.88, 0.86, 0.82), 0.85, bump_scale=300, bump_strength=0.1)
M_CUSHION = principled("Cushion", (0.62, 0.36, 0.12), 0.9, bump_scale=250, bump_strength=0.3, sheen=0.4)
M_RUG = principled("Rug", (0.50, 0.44, 0.36), 1.0, bump_scale=120, bump_strength=0.6)
M_BRASS = principled("Brass", (0.80, 0.55, 0.22), 0.3, metallic=1.0)
M_CERAMIC = principled("Ceramic", (0.75, 0.72, 0.66), 0.25)
M_BOOK = principled("Book", (0.12, 0.18, 0.28), 0.6)
M_SHADE = shade_material()
M_CURTAIN = curtain_material()


def skyline_material():
    """멀리 보이는 건물: 어두운 실루엣 + 드문드문 불 켜진 창"""
    m, n, l = new_mat("Skyline")
    out = n.new("ShaderNodeOutputMaterial")
    b = n.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (0.012, 0.012, 0.02, 1)
    b.inputs["Roughness"].default_value = 1.0
    tc = n.new("ShaderNodeTexCoord")
    sep = n.new("ShaderNodeSeparateXYZ")
    comb = n.new("ShaderNodeCombineXYZ")
    br = n.new("ShaderNodeTexBrick")
    br.offset = 0.0
    br.inputs["Color1"].default_value = (0, 0, 0, 1)
    br.inputs["Color2"].default_value = (1.0, 0.6, 0.25, 1)
    br.inputs["Mortar"].default_value = (0, 0, 0, 1)
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.35
    br.inputs["Bias"].default_value = -0.75
    br.inputs["Brick Width"].default_value = 0.9
    br.inputs["Row Height"].default_value = 0.8
    l.new(tc.outputs["Object"], sep.inputs[0])
    l.new(sep.outputs["Y"], comb.inputs["X"])
    l.new(sep.outputs["Z"], comb.inputs["Y"])
    l.new(comb.outputs[0], br.inputs["Vector"])
    l.new(br.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = 3.0
    l.new(b.outputs["BSDF"], out.inputs["Surface"])
    return m


M_DARK = skyline_material()


# ───────────────────────── 2. 형태 도우미 ─────────────────────────
def obj_from_bm(name, bm, mat, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    if mat:
        me.materials.append(mat)
    return ob


def box(name, center, size, mat, bevel=0.0, soft=False):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    ob = obj_from_bm(name, bm, mat, smooth=soft)
    ob.location = center
    if bevel:
        mod = ob.modifiers.new("Bevel", "BEVEL")
        mod.width, mod.segments = bevel, 4
    if soft:
        ob.modifiers.new("Subsurf", "SUBSURF").levels = 2
        ob.modifiers["Subsurf"].render_levels = 2
    return ob


def cyl(name, center, r1, r2, h, mat, caps=True, seg=48, smooth=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=caps, segments=seg, radius1=r1, radius2=r2, depth=h)
    ob = obj_from_bm(name, bm, mat, smooth=smooth)
    ob.location = center
    return ob


def look_at(ob, target):
    ob.rotation_euler = (Vector(target) - ob.location).to_track_quat("-Z", "Y").to_euler()


def drape_profile(s, half, r):
    """평평한 윗면 → 둥근 모서리 → 아래로 늘어짐. (위치, 내려간 양, 바깥쪽 법선 성분)"""
    if s <= half - r:
        return s, 0.0, 0.0
    arc = r * math.pi / 2
    if s <= half - r + arc:
        a = (s - (half - r)) / r
        return half - r + r * math.sin(a), r * (1 - math.cos(a)), math.sin(a)
    e = s - (half - r + arc)
    return half + 0.05 * e, r + e, 1.0


def bedding(name, mat, y_head, length, side_drape, foot_drape=0.0, offset=0.02,
            thickness=0.035, wrinkle=1.0, step=0.03, seed=0.0):
    """매트리스 위에 덮이는 천(이불/담요). y_head 에서 발쪽(-y)으로 length 만큼 덮는다."""
    half, r = BED_W / 2 + offset, 0.07
    s_max = half - r + r * math.pi / 2 + side_drape
    t_max = length + (r * (math.pi / 2 - 1) + foot_drape if foot_drape else 0.0)
    nu, nv = int(2 * s_max / step) + 1, int(t_max / step) + 1
    bm = bmesh.new()
    grid = []
    for j in range(nv + 1):
        t = t_max * j / nv
        row = []
        for i in range(nu + 1):
            s = -s_max + 2 * s_max * i / nu
            px, dx, nx = drape_profile(abs(s), half, r)
            sign = 1 if s >= 0 else -1
            if foot_drape:
                py, dy, ny = drape_profile(t, length, r)
            else:
                py, dy, ny = t, 0.0, 0.0
            drop = max(dx, dy)
            p = Vector((BX + sign * px, y_head - py, MAT_TOP + offset - drop))
            n = Vector((sign * nx, -ny, max(0.0, 1 - max(nx, ny)))).normalized()
            hang = max(nx, ny)
            # 큰 굴곡 + 잔주름 + 늘어진 부분의 세로 주름
            w = 0.030 * noise.noise(Vector((p.x * 2.0, p.y * 2.0, seed)))
            w += 0.014 * noise.noise(Vector((p.x * 4.5, p.y * 4.5, seed + 7)))
            w += 0.006 * noise.noise(Vector((p.x * 9, p.y * 9, seed + 3)))
            along = p.y if nx >= ny else p.x
            w += hang * 0.022 * math.sin(along * 13 + 3 * noise.noise(Vector((along * 1.5, seed, 0)))) \
                * min(1.0, drop / 0.15)
            row.append(bm.verts.new(p + n * (w * wrinkle)))
        grid.append(row)
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    ob = obj_from_bm(name, bm, mat, smooth=True)
    so = ob.modifiers.new("Solidify", "SOLIDIFY")
    so.thickness, so.offset = thickness, 1.0
    sub = ob.modifiers.new("Subsurf", "SUBSURF")
    sub.levels = sub.render_levels = 1
    return ob


def pillow(name, mat, loc, size, rot=(0, 0, 0), seed=0.0):
    a, b, h = size[0] / 2, size[1] / 2, size[2] / 2
    n = 20
    bm = bmesh.new()
    for sgn in (1, -1):
        g = []
        for j in range(n + 1):
            v = -1 + 2 * j / n
            row = []
            for i in range(n + 1):
                u = -1 + 2 * i / n
                z = h * ((1 - u * u) * (1 - v * v)) ** 0.38
                x = a * u * (1 - 0.06 * (1 - abs(v)) * abs(u) ** 3)
                y = b * v * (1 - 0.06 * (1 - abs(u)) * abs(v) ** 3)
                z += 0.012 * noise.noise(Vector((u * 2, v * 2, seed + sgn))) * (1 - u * u) * (1 - v * v)
                row.append(bm.verts.new((x, y, sgn * z)))
            g.append(row)
        for j in range(n):
            for i in range(n):
                f = (g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i])
                bm.faces.new(f if sgn > 0 else f[::-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    ob = obj_from_bm(name, bm, mat, smooth=True)
    ob.location, ob.rotation_euler = loc, rot
    sub = ob.modifiers.new("Subsurf", "SUBSURF")
    sub.levels = sub.render_levels = 1
    return ob


def curtain(name, y0, y1, x, z0, z1, folds):
    nu, nv = 80, 12
    bm = bmesh.new()
    g = []
    for j in range(nv + 1):
        z = z0 + (z1 - z0) * j / nv
        row = []
        for i in range(nu + 1):
            f = i / nu
            y = y0 + (y1 - y0) * f
            amp = 0.035 * (1.0 - 0.25 * j / nv)
            dx = amp * math.sin(f * folds * 2 * math.pi) + 0.01 * noise.noise(Vector((y * 3, z * 0.7, 1)))
            row.append(bm.verts.new((x + dx, y, z)))
        g.append(row)
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]))
    return obj_from_bm(name, bm, M_CURTAIN, smooth=True)


# ───────────────────────── 3. 방 (바닥·벽·천장·창문) ─────────────────────────
box("Floor", (0, 0, -0.05), (2 * RX + 2 * WT, 2 * RY + 2 * WT, 0.1), M_FLOOR)
box("Ceiling", (0, 0, RZ + 0.05), (2 * RX + 2 * WT, 2 * RY + 2 * WT, 0.1), M_CEIL)
box("WallBack", (0, RY + WT / 2, RZ / 2), (2 * RX + 2 * WT, WT, RZ), M_WALL)
box("WallFront", (0, -RY - WT / 2, RZ / 2), (2 * RX + 2 * WT, WT, RZ), M_WALL)
box("WallRight", (RX + WT / 2, 0, RZ / 2), (WT, 2 * RY, RZ), M_WALL)
# 왼쪽 벽: 창문 구멍을 남기고 4조각으로
xl = -RX - WT / 2
box("WallL_below", (xl, 0, WIN_Z0 / 2), (WT, 2 * RY, WIN_Z0), M_WALL)
box("WallL_above", (xl, 0, (WIN_Z1 + RZ) / 2), (WT, 2 * RY, RZ - WIN_Z1), M_WALL)
box("WallL_front", (xl, (-RY + WIN_Y0) / 2, (WIN_Z0 + WIN_Z1) / 2), (WT, WIN_Y0 + RY, WIN_Z1 - WIN_Z0), M_WALL)
box("WallL_back", (xl, (RY + WIN_Y1) / 2, (WIN_Z0 + WIN_Z1) / 2), (WT, RY - WIN_Y1, WIN_Z1 - WIN_Z0), M_WALL)
# 걸레받이
box("BaseBack", (0, RY - 0.008, 0.05), (2 * RX, 0.016, 0.1), M_TRIM)
box("BaseLeft", (-RX + 0.008, 0, 0.05), (0.016, 2 * RY, 0.1), M_TRIM)
box("BaseRight", (RX - 0.008, 0, 0.05), (0.016, 2 * RY, 0.1), M_TRIM)

# 창틀 + 창살 + 창턱
wy, wz = (WIN_Y0 + WIN_Y1) / 2, (WIN_Z0 + WIN_Z1) / 2
ww, wh, fx = WIN_Y1 - WIN_Y0, WIN_Z1 - WIN_Z0, -RX - 0.06
F = 0.05
box("FrameTop", (fx, wy, WIN_Z1 - F / 2), (0.07, ww, F), M_TRIM)
box("FrameBot", (fx, wy, WIN_Z0 + F / 2), (0.07, ww, F), M_TRIM)
box("FrameL", (fx, WIN_Y0 + F / 2, wz), (0.07, F, wh), M_TRIM)
box("FrameR", (fx, WIN_Y1 - F / 2, wz), (0.07, F, wh), M_TRIM)
box("MullionV", (fx, wy, wz), (0.05, 0.035, wh), M_TRIM)
box("MullionH", (fx, wy, WIN_Z0 + wh * 0.62), (0.05, ww, 0.035), M_TRIM)
box("Sill", (-RX + 0.03, wy, WIN_Z0 - 0.015), (0.2, ww + 0.12, 0.03), M_TRIM, bevel=0.006)

# 커튼 (창 양옆으로 걷어둔 상태) + 커튼봉
curtain("CurtainL", WIN_Y0 - 0.38, WIN_Y0 + 0.12, -RX + 0.12, 0.04, 2.46, 5)
curtain("CurtainR", WIN_Y1 - 0.12, WIN_Y1 + 0.38, -RX + 0.12, 0.04, 2.46, 5)
rod = cyl("CurtainRod", (-RX + 0.12, wy, 2.47), 0.012, 0.012, ww + 1.0, M_BRASS)
rod.rotation_euler = (math.pi / 2, 0, 0)

# 창밖 먼 건물 실루엣
for i in range(28):
    top = random.uniform(0.5, 4.5)          # 해를 가리지 않도록 낮게
    w = random.uniform(6, 11)
    box(f"Skyline{i}", (-60 - random.uniform(0, 15), -75 + i * 5.5, (top - 12) / 2), (8, w, top + 12), M_DARK)

# ───────────────────────── 4. 침대 ─────────────────────────
bed_len = BED_HEAD_Y - BED_FOOT_Y
bed_cy = (BED_HEAD_Y + BED_FOOT_Y) / 2
box("BedFrame", (BX, bed_cy, 0.27), (BED_W - 0.10, bed_len - 0.08, 0.18), M_WOOD, bevel=0.01)
for sx in (-1, 1):
    for sy in (-1, 1):
        box("BedLeg", (BX + sx * (BED_W / 2 - 0.12), bed_cy + sy * (bed_len / 2 - 0.12), 0.09),
            (0.06, 0.06, 0.18), M_WOOD)
box("Headboard", (BX, RY - 0.06, 0.70), (BED_W + 0.2, 0.11, 1.0), M_HEAD, bevel=0.04, soft=True)
box("Mattress", (BX, bed_cy, 0.48), (BED_W, bed_len, 0.24), M_SHEET, bevel=0.05, soft=True)

# 베개 2개 + 쿠션
tilt = math.radians(62)
pillow("PillowL", M_PILLOW, (BX - 0.40, BED_HEAD_Y - 0.19, MAT_TOP + 0.24), (0.70, 0.46, 0.17), (tilt, 0, 0.04), 1)
pillow("PillowR", M_PILLOW, (BX + 0.40, BED_HEAD_Y - 0.19, MAT_TOP + 0.24), (0.70, 0.46, 0.17), (tilt, 0, -0.05), 2)
pillow("Cushion", M_CUSHION, (BX + 0.05, BED_HEAD_Y - 0.42, MAT_TOP + 0.17), (0.46, 0.32, 0.13),
       (math.radians(50), 0, 0.12), 3)

# 이불: 본체 + 머리쪽으로 접어 넘긴 부분 + 발치의 담요
DUVET_TOP_Y = BED_HEAD_Y - 0.72
bedding("Duvet", M_DUVET, DUVET_TOP_Y, DUVET_TOP_Y - BED_FOOT_Y + 0.02, side_drape=0.30, foot_drape=0.30, thickness=0.05, seed=1)
bedding("DuvetFold", M_FOLD, DUVET_TOP_Y + 0.02, 0.38, side_drape=0.26, offset=0.06, seed=5)
bedding("Throw", M_THROW, BED_FOOT_Y + 0.62, 0.42, side_drape=0.36, offset=0.065, thickness=0.02,
        wrinkle=1.3, seed=9)

# ───────────────────────── 5. 협탁 + 스탠드 조명 ─────────────────────────
def nightstand(x):
    y, w, d, h = RY - 0.26, 0.46, 0.40, 0.50
    box("Nightstand", (x, y, h - 0.15), (w, d, 0.30), M_WOOD, bevel=0.008)
    box("Drawer", (x, y - d / 2 - 0.004, h - 0.15), (w - 0.05, 0.012, 0.22), M_WOOD, bevel=0.004)
    cyl("Knob", (x, y - d / 2 - 0.02, h - 0.15), 0.012, 0.012, 0.02, M_BRASS).rotation_euler = (math.pi / 2, 0, 0)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl("NsLeg", (x + sx * (w / 2 - 0.04), y + sy * (d / 2 - 0.04), 0.10), 0.012, 0.018, 0.20, M_WOOD)
    return y, h


def table_lamp(x, y, z, watts):
    cyl("LampBase", (x, y, z + 0.01), 0.065, 0.06, 0.02, M_BRASS)
    cyl("LampBody", (x, y, z + 0.10), 0.045, 0.03, 0.16, M_CERAMIC)
    cyl("LampStem", (x, y, z + 0.22), 0.008, 0.008, 0.10, M_BRASS)
    cyl("LampShade", (x, y, z + 0.36), 0.15, 0.10, 0.20, M_SHADE, caps=False)
    ld = bpy.data.lights.new("LampLight", "POINT")
    ld.energy, ld.color, ld.shadow_soft_size = watts, (1.0, 0.58, 0.28), 0.035
    lo = bpy.data.objects.new("LampLight", ld)
    lo.location = (x, y, z + 0.35)
    col.objects.link(lo)


for side, watts in ((-1, 6), (1, 6)):
    nx_ = BX + side * (BED_W / 2 + 0.36)
    ny_, nh = nightstand(nx_)
    table_lamp(nx_ + side * 0.03, ny_ + 0.05, nh, watts)
    if side > 0:  # 오른쪽 협탁 위 책 + 머그
        box("Book1", (nx_ - 0.08, ny_ - 0.10, nh + 0.012), (0.15, 0.21, 0.024), M_BOOK, bevel=0.003)
        box("Book2", (nx_ - 0.075, ny_ - 0.105, nh + 0.034), (0.14, 0.20, 0.02), M_CUSHION, bevel=0.003)

# ───────────────────────── 6. 소품: 러그 · 액자 ─────────────────────────
box("Rug", (BX + 0.25, 0.25, 0.008), (2.7, 1.9, 0.016), M_RUG, bevel=0.006)
ART1 = art_material("Art1", [(0.80, 0.74, 0.64), (0.62, 0.30, 0.15), (0.12, 0.20, 0.22)], 2.2)
ART2 = art_material("Art2", [(0.78, 0.72, 0.62), (0.15, 0.24, 0.26), (0.72, 0.50, 0.20)], 3.0)
for i, (dx, art) in enumerate(((-0.36, ART1), (0.36, ART2))):
    box(f"PicFrame{i}", (BX + dx, RY - 0.015, 1.72), (0.52, 0.03, 0.70), M_WOOD, bevel=0.004)
    box(f"PicMat{i}", (BX + dx, RY - 0.032, 1.72), (0.46, 0.006, 0.64), M_TRIM)
    box(f"PicArt{i}", (BX + dx, RY - 0.036, 1.72), (0.34, 0.004, 0.50), art)

# 화분 (창과 침대 사이 모서리)
M_LEAF = principled("Leaf", (0.035, 0.11, 0.035), 0.45)
M_POT = principled("Pot", (0.55, 0.26, 0.14), 0.7)
PX, PY = -2.08, 1.88
cyl("Pot", (PX, PY, 0.19), 0.12, 0.17, 0.38, M_POT)
cyl("Soil", (PX, PY, 0.36), 0.155, 0.155, 0.02, principled("Soil", (0.03, 0.02, 0.015), 1.0))
bm = bmesh.new()
for k in range(18):
    az = k * 2.39996 + random.uniform(-0.3, 0.3)          # 황금각으로 고르게 퍼뜨림
    length = random.uniform(0.55, 1.0)
    th0, bend = math.radians(random.uniform(4, 22)), math.radians(random.uniform(50, 95))
    wmax = random.uniform(0.045, 0.07)
    out_dir = Vector((math.cos(az), math.sin(az), 0))
    side_dir = Vector((-math.sin(az), math.cos(az), 0))
    p, prev, seg = Vector((PX, PY, 0.36)) + out_dir * 0.04, None, 12
    for i in range(seg + 1):
        t = i / seg
        th = th0 + bend * t * t
        if i:
            p = p + (out_dir * math.sin(th) + Vector((0, 0, math.cos(th)))) * (length / seg)
        w = wmax * math.sin(math.pi * min(1.0, 0.08 + t * 0.92)) ** 0.6
        cur = (bm.verts.new(p - side_dir * w), bm.verts.new(p + side_dir * w))
        if prev:
            bm.faces.new((prev[0], prev[1], cur[1], cur[0]))
        prev = cur
obj_from_bm("PlantLeaves", bm, M_LEAF, smooth=True)

# ───────────────────────── 7. 저녁 하늘 + 노을빛 ─────────────────────────
world = bpy.data.worlds.new("Dusk")
scene.world = world
try:
    world.use_nodes = True
except Exception:
    pass
wn, wl = world.node_tree.nodes, world.node_tree.links
wn.clear()
w_out = wn.new("ShaderNodeOutputWorld")
w_bg = wn.new("ShaderNodeBackground")
w_tc = wn.new("ShaderNodeTexCoord")
w_sep = wn.new("ShaderNodeSeparateXYZ")
w_map = wn.new("ShaderNodeMapRange")
w_map.inputs["From Min"].default_value = -0.15
w_map.inputs["From Max"].default_value = 0.7
w_ramp = wn.new("ShaderNodeValToRGB")
els = w_ramp.color_ramp.elements
els[0].position, els[0].color = 0.0, (0.02, 0.02, 0.04, 1)       # 지면
els[1].position, els[1].color = 1.0, (0.015, 0.03, 0.12, 1)      # 천정(짙은 남색)
for pos, c in ((0.165, (0.03, 0.02, 0.03)), (0.18, (1.0, 0.36, 0.08)), (0.26, (0.85, 0.28, 0.22)), (0.42, (0.30, 0.18, 0.40)),
               (0.65, (0.06, 0.08, 0.28))):
    e = els.new(pos)
    e.color = (*c, 1)
w_bg.inputs["Strength"].default_value = 1.4
wl.new(w_tc.outputs["Generated"], w_sep.inputs[0])
wl.new(w_sep.outputs["Z"], w_map.inputs["Value"])
wl.new(w_map.outputs[0], w_ramp.inputs["Fac"])
wl.new(w_ramp.outputs["Color"], w_bg.inputs["Color"])
wl.new(w_bg.outputs[0], w_out.inputs["Surface"])

# 지는 해: 창문으로 낮게 들어오는 주황빛
sun_d = bpy.data.lights.new("Sunset", "SUN")
sun_d.energy, sun_d.color, sun_d.angle = 10.0, (1.0, 0.33, 0.09), math.radians(2.5)
sun = bpy.data.objects.new("Sunset", sun_d)
sun.rotation_euler = Vector((0.75, 0.62, -0.20)).to_track_quat("-Z", "Y").to_euler()
col.objects.link(sun)

# ───────────────────────── 8. 카메라 + 렌더 설정 ─────────────────────────
cam_d = bpy.data.cameras.new("Camera")
cam_d.lens, cam_d.clip_start = 24, 0.05
cam = bpy.data.objects.new("Camera", cam_d)
cam.location = (2.1, -2.0, 1.45)
col.objects.link(cam)
look_at(cam, (-0.5, 1.0, 0.85))
scene.camera = cam

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = args.samples
scene.cycles.use_adaptive_sampling = True
scene.cycles.max_bounces = 8
scene.cycles.sample_clamp_indirect = 8
scene.cycles.caustics_reflective = scene.cycles.caustics_refractive = False
scene.cycles.use_denoising = True
try:
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
except Exception:
    pass
scene.render.resolution_x, scene.render.resolution_y = args.res
scene.render.image_settings.file_format = "PNG"
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = 0.9

if args.blend:
    bpy.ops.wm.save_as_mainfile(filepath=bpy.path.abspath(args.blend))
if not args.no_render:
    scene.render.filepath = bpy.path.abspath(args.out)
    bpy.ops.render.render(write_still=True)
    print("저장 완료:", scene.render.filepath)
