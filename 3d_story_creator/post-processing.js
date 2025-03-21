const CopyShader = {
    name: "CopyShader",
    uniforms: { tDiffuse: { value: null }, opacity: { value: 1 } },
    vertexShader:
      "\n  \n          varying vec2 vUv;\n  \n          void main() {\n  \n              vUv = uv;\n              gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n  \n          }",
    fragmentShader:
      "\n  \n          uniform float opacity;\n  \n          uniform sampler2D tDiffuse;\n  \n          varying vec2 vUv;\n  \n          void main() {\n  \n              gl_FragColor = texture2D( tDiffuse, vUv );\n              gl_FragColor.a *= opacity;\n  \n  \n          }",
  },
  BufferGeometry = THREE.BufferGeometry,
  Float32BufferAttribute = THREE.Float32BufferAttribute,
  OrthographicCamera = THREE.OrthographicCamera,
  Mesh = THREE.Mesh;
class Pass {
  constructor() {
    (this.isPass = !0),
      (this.enabled = !0),
      (this.needsSwap = !0),
      (this.clear = !1),
      (this.renderToScreen = !1);
  }
  setSize() {}
  render() {}
  dispose() {}
}
const _camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1),
  _geometry = new BufferGeometry();
_geometry.setAttribute(
  "position",
  new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3)
),
  _geometry.setAttribute(
    "uv",
    new Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2)
  );
class FullScreenQuad {
  constructor(e) {
    this._mesh = new Mesh(_geometry, e);
  }
  dispose() {
    this._mesh.geometry.dispose();
  }
  render(e) {
    const t = e.xr.enabled;
    (e.xr.enabled = !1), e.render(this._mesh, _camera), (e.xr.enabled = t);
  }
  get material() {
    return this._mesh.material;
  }
  set material(e) {
    this._mesh.material = e;
  }
}
const ShaderMaterial = THREE.ShaderMaterial,
  UniformsUtils = THREE.UniformsUtils;
class ShaderPass extends Pass {
  constructor(e, t) {
    super(),
      (this.textureID = void 0 !== t ? t : "tDiffuse"),
      e instanceof ShaderMaterial
        ? ((this.uniforms = e.uniforms), (this.material = e))
        : e &&
          ((this.uniforms = UniformsUtils.clone(e.uniforms)),
          (this.material = new ShaderMaterial({
            name: void 0 !== e.name ? e.name : "unspecified",
            defines: Object.assign({}, e.defines),
            uniforms: this.uniforms,
            vertexShader: e.vertexShader,
            fragmentShader: e.fragmentShader,
          }))),
      (this.fsQuad = new FullScreenQuad(this.material));
  }
  render(e, t, n) {
    this.uniforms[this.textureID] &&
      (this.uniforms[this.textureID].value = n.texture),
      (this.fsQuad.material = this.material),
      this.renderToScreen
        ? (e.setRenderTarget(null), this.fsQuad.render(e))
        : (e.setRenderTarget(t),
          this.clear &&
            e.clear(e.autoClearColor, e.autoClearDepth, e.autoClearStencil),
          this.fsQuad.render(e));
  }
  dispose() {
    this.material.dispose(), this.fsQuad.dispose();
  }
}
class MaskPass extends Pass {
  constructor(e, t) {
    super(),
      (this.scene = e),
      (this.camera = t),
      (this.clear = !0),
      (this.needsSwap = !1),
      (this.inverse = !1);
  }
  render(e, t, n) {
    const r = e.getContext(),
      i = e.state;
    let s, a;
    i.buffers.color.setMask(!1),
      i.buffers.depth.setMask(!1),
      i.buffers.color.setLocked(!0),
      i.buffers.depth.setLocked(!0),
      this.inverse ? ((s = 0), (a = 1)) : ((s = 1), (a = 0)),
      i.buffers.stencil.setTest(!0),
      i.buffers.stencil.setOp(r.REPLACE, r.REPLACE, r.REPLACE),
      i.buffers.stencil.setFunc(r.ALWAYS, s, 4294967295),
      i.buffers.stencil.setClear(a),
      i.buffers.stencil.setLocked(!0),
      e.setRenderTarget(n),
      this.clear && e.clear(),
      e.render(this.scene, this.camera),
      e.setRenderTarget(t),
      this.clear && e.clear(),
      e.render(this.scene, this.camera),
      i.buffers.color.setLocked(!1),
      i.buffers.depth.setLocked(!1),
      i.buffers.stencil.setLocked(!1),
      i.buffers.stencil.setFunc(r.EQUAL, 1, 4294967295),
      i.buffers.stencil.setOp(r.KEEP, r.KEEP, r.KEEP),
      i.buffers.stencil.setLocked(!0);
  }
}
class ClearMaskPass extends Pass {
  constructor() {
    super(), (this.needsSwap = !1);
  }
  render(e) {
    e.state.buffers.stencil.setLocked(!1), e.state.buffers.stencil.setTest(!1);
  }
}
const Clock = THREE.Clock,
  HalfFloatType = THREE.HalfFloatType,
  Vector2 = THREE.Vector2,
  WebGLRenderTarget = THREE.WebGLRenderTarget,
  size = new Vector2();
class EffectComposer {
  constructor(e, t) {
    (this.renderer = e),
      (this._pixelRatio = e.getPixelRatio()),
      void 0 === t
        ? (e.getSize(size),
          (this._width = size.width),
          (this._height = size.height),
          ((t = new WebGLRenderTarget(
            this._width * this._pixelRatio,
            this._height * this._pixelRatio,
            { type: HalfFloatType }
          )).texture.name = "EffectComposer.rt1"))
        : ((this._width = t.width), (this._height = t.height)),
      (this.renderTarget1 = t),
      (this.renderTarget2 = t.clone()),
      (this.renderTarget2.texture.name = "EffectComposer.rt2"),
      (this.writeBuffer = this.renderTarget1),
      (this.readBuffer = this.renderTarget2),
      (this.renderToScreen = !0),
      (this.passes = []),
      (this.copyPass = new ShaderPass(CopyShader)),
      (this.clock = new Clock()),
      (this.onSessionStateChange = this.onSessionStateChange.bind(this)),
      this.renderer.xr.addEventListener(
        "sessionstart",
        this.onSessionStateChange
      ),
      this.renderer.xr.addEventListener(
        "sessionend",
        this.onSessionStateChange
      );
  }
  onSessionStateChange() {
    this.renderer.getSize(size),
      (this._width = size.width),
      (this._height = size.height),
      (this._pixelRatio = this.renderer.xr.isPresenting
        ? 1
        : this.renderer.getPixelRatio()),
      this.setSize(this._width, this._height);
  }
  swapBuffers() {
    const e = this.readBuffer;
    (this.readBuffer = this.writeBuffer), (this.writeBuffer = e);
  }
  addPass(e) {
    this.passes.push(e),
      e.setSize(
        this._width * this._pixelRatio,
        this._height * this._pixelRatio
      );
  }
  insertPass(e, t) {
    this.passes.splice(t, 0, e),
      e.setSize(
        this._width * this._pixelRatio,
        this._height * this._pixelRatio
      );
  }
  removePass(e) {
    const t = this.passes.indexOf(e);
    -1 !== t && this.passes.splice(t, 1);
  }
  isLastEnabledPass(e) {
    for (let t = e + 1; t < this.passes.length; t++)
      if (this.passes[t].enabled) return !1;
    return !0;
  }
  render(e) {
    void 0 === e && (e = this.clock.getDelta());
    const t = this.renderer.getRenderTarget();
    let n = !1;
    for (let t = 0, r = this.passes.length; t < r; t++) {
      const r = this.passes[t];
      if (!1 !== r.enabled) {
        if (
          ((r.renderToScreen =
            this.renderToScreen && this.isLastEnabledPass(t)),
          r.render(this.renderer, this.writeBuffer, this.readBuffer, e, n),
          r.needsSwap)
        ) {
          if (n) {
            const t = this.renderer.getContext(),
              n = this.renderer.state.buffers.stencil;
            n.setFunc(t.NOTEQUAL, 1, 4294967295),
              this.copyPass.render(
                this.renderer,
                this.writeBuffer,
                this.readBuffer,
                e
              ),
              n.setFunc(t.EQUAL, 1, 4294967295);
          }
          this.swapBuffers();
        }
        void 0 !== MaskPass &&
          (r instanceof MaskPass
            ? (n = !0)
            : r instanceof ClearMaskPass && (n = !1));
      }
    }
    this.renderer.setRenderTarget(t);
  }
  reset(e) {
    void 0 === e &&
      (this.renderer.getSize(size),
      (this._pixelRatio = this.renderer.getPixelRatio()),
      (this._width = size.width),
      (this._height = size.height),
      (e = this.renderTarget1.clone()).setSize(
        this._width * this._pixelRatio,
        this._height * this._pixelRatio
      )),
      this.renderTarget1.dispose(),
      this.renderTarget2.dispose(),
      (this.renderTarget1 = e),
      (this.renderTarget2 = e.clone()),
      (this.writeBuffer = this.renderTarget1),
      (this.readBuffer = this.renderTarget2);
  }
  setSize(e, t) {
    (this._width = e), (this._height = t);
    const n = this._width * this._pixelRatio,
      r = this._height * this._pixelRatio;
    this.renderTarget1.setSize(n, r), this.renderTarget2.setSize(n, r);
    for (let e = 0; e < this.passes.length; e++) this.passes[e].setSize(n, r);
  }
  setPixelRatio(e) {
    (this._pixelRatio = e), this.setSize(this._width, this._height);
  }
  dispose() {
    this.renderTarget1.dispose(),
      this.renderTarget2.dispose(),
      this.copyPass.dispose(),
      this.renderer.xr.removeEventListener(
        "sessionstart",
        this.onSessionStateChange
      ),
      this.renderer.xr.removeEventListener(
        "sessionend",
        this.onSessionStateChange
      );
  }
}
const Color = THREE.Color;
class RenderPass extends Pass {
  constructor(e, t, n, r, i) {
    super(),
      (this.scene = e),
      (this.camera = t),
      (this.overrideMaterial = n),
      (this.clearColor = r),
      (this.clearAlpha = void 0 !== i ? i : 0),
      (this.clear = !0),
      (this.clearDepth = !1),
      (this.needsSwap = !1),
      (this._oldClearColor = new Color());
  }
  render(e, t, n) {
    const r = e.autoClear;
    let i, s;
    (e.autoClear = !1),
      void 0 !== this.overrideMaterial &&
        ((s = this.scene.overrideMaterial),
        (this.scene.overrideMaterial = this.overrideMaterial)),
      this.clearColor &&
        (e.getClearColor(this._oldClearColor),
        (i = e.getClearAlpha()),
        e.setClearColor(this.clearColor, this.clearAlpha)),
      this.clearDepth && e.clearDepth(),
      e.setRenderTarget(this.renderToScreen ? null : n),
      this.clear &&
        e.clear(e.autoClearColor, e.autoClearDepth, e.autoClearStencil),
      e.render(this.scene, this.camera),
      this.clearColor && e.setClearColor(this._oldClearColor, i),
      void 0 !== this.overrideMaterial && (this.scene.overrideMaterial = s),
      (e.autoClear = r);
  }
}
const vertexShader =
    "\n    varying vec2 vUv;\n    void main() {\n        vUv = uv;\n        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n    }\n    ",
  fragmentShader =
    '\n    uniform sampler2D tDiffuse;\n    uniform sampler2D uNormals;\n    uniform sampler2D uTexture;\n    uniform vec2 uResolution;\n    varying vec2 vUv;\n    // The MIT License\n    // Copyright © 2013 Inigo Quilez\n    // Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n    // https://www.youtube.com/c/InigoQuilez\n    // https://iquilezles.org\n    vec2 grad( ivec2 z )  // replace this anything that returns a random vector\n    {\n        // 2D to 1D  (feel free to replace by some other)\n        int n = z.x+z.y*11111;\n        // Hugo Elias hash (feel free to replace by another one)\n        n = (n<<13)^n;\n        n = (n*(n*n*15731+789221)+1376312589)>>16;\n        // Perlin style vectors\n        n &= 7;\n        vec2 gr = vec2(n&1,n>>1)*2.0-1.0;\n        return ( n>=6 ) ? vec2(0.0,gr.x) : \n               ( n>=4 ) ? vec2(gr.x,0.0) :\n                                  gr;                            \n    }\n    \n    float noise( in vec2 p ) {\n        ivec2 i = ivec2(floor( p ));\n         vec2 f =       fract( p );\n        \n        vec2 u = f*f*(3.0-2.0*f); // feel free to replace by a quintic smoothstep instead\n    \n        return mix( mix( dot( grad( i+ivec2(0,0) ), f-vec2(0.0,0.0) ), \n                         dot( grad( i+ivec2(1,0) ), f-vec2(1.0,0.0) ), u.x),\n                    mix( dot( grad( i+ivec2(0,1) ), f-vec2(0.0,1.0) ), \n                         dot( grad( i+ivec2(1,1) ), f-vec2(1.0,1.0) ), u.x), u.y);\n    }\n    \n    float valueAtPoint(sampler2D image, vec2 coord, vec2 texel, vec2 point) {\n        vec3 luma = vec3(0.299, 0.587, 0.114);\n    \n        return dot(texture2D(image, coord + texel * point).xyz, luma);\n    }\n    \n    float diffuseValue(int x, int y) {\n        float cutoff = 40.0;\n        float offset =  0.5 / cutoff;\n        float noiseValue = clamp(texture(uTexture, vUv).r, 0.0, cutoff) / cutoff - offset;\n    \n        return valueAtPoint(tDiffuse, vUv + noiseValue, vec2(1.0 / uResolution.x, 1.0 / uResolution.y), vec2(x, y)) * 0.6;\n    }\n    \n    float normalValue(int x, int y) {\n        float cutoff = 50.0;\n        float offset = 0.5 / cutoff;\n        float noiseValue = clamp(texture(uTexture, vUv).r, 0.0, cutoff) / cutoff - offset;\n    \n        return valueAtPoint(uNormals, vUv + noiseValue, vec2(1.0 / uResolution.x, 1.0 / uResolution.y), vec2(x, y)) * 0.3;\n    }\n    \n    float getValue(int x, int y) {\n        float noiseValue = noise(gl_FragCoord.xy);\n        noiseValue = noiseValue * 2.0 - 1.0;\n        noiseValue *= 10.0;\n    \n        return diffuseValue(x, y) + normalValue(x, y) * noiseValue;\n    }\n    \n    float combinedSobelValue() {\n        // kernel definition (in glsl matrices are filled in column-major order)\n        const mat3 Gx = mat3(-1, -2, -1, 0, 0, 0, 1, 2, 1);// x direction kernel\n        const mat3 Gy = mat3(-1, 0, 1, -2, 0, 2, -1, 0, 1);// y direction kernel\n    \n        // fetch the 3x3 neighbourhood of a fragment\n    \n        // first column\n        float tx0y0 = getValue(-1, -1);\n        float tx0y1 = getValue(-1, 0);\n        float tx0y2 = getValue(-1, 1);\n    \n        // second column\n        float tx1y0 = getValue(0, -1);\n        float tx1y1 = getValue(0, 0);\n        float tx1y2 = getValue(0, 1);\n    \n        // third column\n        float tx2y0 = getValue(1, -1);\n        float tx2y1 = getValue(1, 0);\n        float tx2y2 = getValue(1, 1);\n    \n        // gradient value in x direction\n        float valueGx = Gx[0][0] * tx0y0 + Gx[1][0] * tx1y0 + Gx[2][0] * tx2y0 +\n        Gx[0][1] * tx0y1 + Gx[1][1] * tx1y1 + Gx[2][1] * tx2y1 +\n        Gx[0][2] * tx0y2 + Gx[1][2] * tx1y2 + Gx[2][2] * tx2y2;\n    \n        // gradient value in y direction\n        float valueGy = Gy[0][0] * tx0y0 + Gy[1][0] * tx1y0 + Gy[2][0] * tx2y0 +\n        Gy[0][1] * tx0y1 + Gy[1][1] * tx1y1 + Gy[2][1] * tx2y1 +\n        Gy[0][2] * tx0y2 + Gy[1][2] * tx1y2 + Gy[2][2] * tx2y2;\n    \n        // magnitude of the total gradient\n        float G = (valueGx * valueGx) + (valueGy * valueGy);\n        return clamp(G, 0.0, 1.0);\n    }\n    void main() {\n        float sobelValue = combinedSobelValue();\n        sobelValue = smoothstep(0.01, 0.03, sobelValue);\n    \n        vec4 lineColor = vec4(0.32, 0.12, 0.2, 1.0);\n    \n        if (sobelValue > 0.1) {\n            gl_FragColor = lineColor;\n        } else {\n            gl_FragColor = vec4(1.0);\n        }\n    }';
class PencilLinesMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        tDiffuse: { value: null },
        uNormals: { value: null },
        uTexture: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
      },
      fragmentShader: fragmentShader,
      vertexShader: vertexShader,
    });
  }
}
class PencilLinesPass extends Pass {
  constructor({ width: e, height: t, scene: n, camera: r }) {
    super(),
      (this.scene = n),
      (this.camera = r),
      (this.material = new PencilLinesMaterial()),
      (this.fsQuad = new FullScreenQuad(this.material));
    const i = new THREE.WebGLRenderTarget(e, t);
    (i.texture.format = THREE.RGBAFormat),
      (i.texture.type = THREE.HalfFloatType),
      (i.texture.minFilter = THREE.NearestFilter),
      (i.texture.magFilter = THREE.NearestFilter),
      (i.texture.generateMipmaps = !1),
      (i.stencilBuffer = !1),
      (this.normalBuffer = i),
      (this.normalMaterial = new THREE.MeshNormalMaterial()),
      (this.material.uniforms.uResolution.value = new THREE.Vector2(e, t));
    new THREE.TextureLoader().load(
      "data:image/png;base64,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",
      (e) => {
        this.material.uniforms.uTexture.value = e;
      }
    );
  }
  dispose() {
    this.material.dispose(), this.fsQuad.dispose();
  }
  render(e, t, n) {
    e.setRenderTarget(this.normalBuffer);
    this.scene.overrideMaterial;
    (this.material.uniforms.uNormals.value = this.normalBuffer.texture),
      (this.material.uniforms.tDiffuse.value = n.texture),
      this.renderToScreen
        ? (e.setRenderTarget(null), this.fsQuad.render(e))
        : (e.setRenderTarget(t),
          this.clear && e.clear(),
          this.fsQuad.render(e));
  }
}

const HalftoneShader = {
  uniforms: {
    tDiffuse: { value: null },
    shape: { value: 1 },
    radius: { value: 4 },
    rotateR: { value: (Math.PI / 12) * 1 },
    rotateG: { value: (Math.PI / 12) * 2 },
    rotateB: { value: (Math.PI / 12) * 3 },
    scatter: { value: 0 },
    width: { value: 1 },
    height: { value: 1 },
    blending: { value: 1 },
    blendingMode: { value: 1 },
    greyscale: { value: !1 },
    disable: { value: !1 },
  },
  vertexShader:
    "\n    \n            varying vec2 vUV;\n    \n            void main() {\n    \n                vUV = uv;\n                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n    \n            }",
  fragmentShader:
    "\n    \n            #define SQRT2_MINUS_ONE 0.41421356\n            #define SQRT2_HALF_MINUS_ONE 0.20710678\n            #define PI2 6.28318531\n            #define SHAPE_DOT 1\n            #define SHAPE_ELLIPSE 2\n            #define SHAPE_LINE 3\n            #define SHAPE_SQUARE 4\n            #define BLENDING_LINEAR 1\n            #define BLENDING_MULTIPLY 2\n            #define BLENDING_ADD 3\n            #define BLENDING_LIGHTER 4\n            #define BLENDING_DARKER 5\n            uniform sampler2D tDiffuse;\n            uniform float radius;\n            uniform float rotateR;\n            uniform float rotateG;\n            uniform float rotateB;\n            uniform float scatter;\n            uniform float width;\n            uniform float height;\n            uniform int shape;\n            uniform bool disable;\n            uniform float blending;\n            uniform int blendingMode;\n            varying vec2 vUV;\n            uniform bool greyscale;\n            const int samples = 8;\n    \n            float blend( float a, float b, float t ) {\n    \n            // linear blend\n                return a * ( 1.0 - t ) + b * t;\n    \n            }\n    \n            float hypot( float x, float y ) {\n    \n            // vector magnitude\n                return sqrt( x * x + y * y );\n    \n            }\n    \n            float rand( vec2 seed ){\n    \n            // get pseudo-random number\n                return fract( sin( dot( seed.xy, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );\n    \n            }\n    \n            float distanceToDotRadius( float channel, vec2 coord, vec2 normal, vec2 p, float angle, float rad_max ) {\n    \n            // apply shape-specific transforms\n                float dist = hypot( coord.x - p.x, coord.y - p.y );\n                float rad = channel;\n    \n                if ( shape == SHAPE_DOT ) {\n    \n                    rad = pow( abs( rad ), 1.125 ) * rad_max;\n    \n                } else if ( shape == SHAPE_ELLIPSE ) {\n    \n                    rad = pow( abs( rad ), 1.125 ) * rad_max;\n    \n                    if ( dist != 0.0 ) {\n                        float dot_p = abs( ( p.x - coord.x ) / dist * normal.x + ( p.y - coord.y ) / dist * normal.y );\n                        dist = ( dist * ( 1.0 - SQRT2_HALF_MINUS_ONE ) ) + dot_p * dist * SQRT2_MINUS_ONE;\n                    }\n    \n                } else if ( shape == SHAPE_LINE ) {\n    \n                    rad = pow( abs( rad ), 1.5) * rad_max;\n                    float dot_p = ( p.x - coord.x ) * normal.x + ( p.y - coord.y ) * normal.y;\n                    dist = hypot( normal.x * dot_p, normal.y * dot_p );\n    \n                } else if ( shape == SHAPE_SQUARE ) {\n    \n                    float theta = atan( p.y - coord.y, p.x - coord.x ) - angle;\n                    float sin_t = abs( sin( theta ) );\n                    float cos_t = abs( cos( theta ) );\n                    rad = pow( abs( rad ), 1.4 );\n                    rad = rad_max * ( rad + ( ( sin_t > cos_t ) ? rad - sin_t * rad : rad - cos_t * rad ) );\n    \n                }\n    \n                return rad - dist;\n    \n            }\n    \n            struct Cell {\n    \n            // grid sample positions\n                vec2 normal;\n                vec2 p1;\n                vec2 p2;\n                vec2 p3;\n                vec2 p4;\n                float samp2;\n                float samp1;\n                float samp3;\n                float samp4;\n    \n            };\n    \n            vec4 getSample( vec2 point ) {\n    \n            // multi-sampled point\n                vec4 tex = texture2D( tDiffuse, vec2( point.x / width, point.y / height ) );\n                float base = rand( vec2( floor( point.x ), floor( point.y ) ) ) * PI2;\n                float step = PI2 / float( samples );\n                float dist = radius * 0.66;\n    \n                for ( int i = 0; i < samples; ++i ) {\n    \n                    float r = base + step * float( i );\n                    vec2 coord = point + vec2( cos( r ) * dist, sin( r ) * dist );\n                    tex += texture2D( tDiffuse, vec2( coord.x / width, coord.y / height ) );\n    \n                }\n    \n                tex /= float( samples ) + 1.0;\n                return tex;\n    \n            }\n    \n            float getDotColour( Cell c, vec2 p, int channel, float angle, float aa ) {\n    \n            // get colour for given point\n                float dist_c_1, dist_c_2, dist_c_3, dist_c_4, res;\n    \n                if ( channel == 0 ) {\n    \n                    c.samp1 = getSample( c.p1 ).r;\n                    c.samp2 = getSample( c.p2 ).r;\n                    c.samp3 = getSample( c.p3 ).r;\n                    c.samp4 = getSample( c.p4 ).r;\n    \n                } else if (channel == 1) {\n    \n                    c.samp1 = getSample( c.p1 ).g;\n                    c.samp2 = getSample( c.p2 ).g;\n                    c.samp3 = getSample( c.p3 ).g;\n                    c.samp4 = getSample( c.p4 ).g;\n    \n                } else {\n    \n                    c.samp1 = getSample( c.p1 ).b;\n                    c.samp3 = getSample( c.p3 ).b;\n                    c.samp2 = getSample( c.p2 ).b;\n                    c.samp4 = getSample( c.p4 ).b;\n    \n                }\n    \n                dist_c_1 = distanceToDotRadius( c.samp1, c.p1, c.normal, p, angle, radius );\n                dist_c_2 = distanceToDotRadius( c.samp2, c.p2, c.normal, p, angle, radius );\n                dist_c_3 = distanceToDotRadius( c.samp3, c.p3, c.normal, p, angle, radius );\n                dist_c_4 = distanceToDotRadius( c.samp4, c.p4, c.normal, p, angle, radius );\n                res = ( dist_c_1 > 0.0 ) ? clamp( dist_c_1 / aa, 0.0, 1.0 ) : 0.0;\n                res += ( dist_c_2 > 0.0 ) ? clamp( dist_c_2 / aa, 0.0, 1.0 ) : 0.0;\n                res += ( dist_c_3 > 0.0 ) ? clamp( dist_c_3 / aa, 0.0, 1.0 ) : 0.0;\n                res += ( dist_c_4 > 0.0 ) ? clamp( dist_c_4 / aa, 0.0, 1.0 ) : 0.0;\n                res = clamp( res, 0.0, 1.0 );\n    \n                return res;\n    \n            }\n    \n            Cell getReferenceCell( vec2 p, vec2 origin, float grid_angle, float step ) {\n    \n            // get containing cell\n                Cell c;\n    \n            // calc grid\n                vec2 n = vec2( cos( grid_angle ), sin( grid_angle ) );\n                float threshold = step * 0.5;\n                float dot_normal = n.x * ( p.x - origin.x ) + n.y * ( p.y - origin.y );\n                float dot_line = -n.y * ( p.x - origin.x ) + n.x * ( p.y - origin.y );\n                vec2 offset = vec2( n.x * dot_normal, n.y * dot_normal );\n                float offset_normal = mod( hypot( offset.x, offset.y ), step );\n                float normal_dir = ( dot_normal < 0.0 ) ? 1.0 : -1.0;\n                float normal_scale = ( ( offset_normal < threshold ) ? -offset_normal : step - offset_normal ) * normal_dir;\n                float offset_line = mod( hypot( ( p.x - offset.x ) - origin.x, ( p.y - offset.y ) - origin.y ), step );\n                float line_dir = ( dot_line < 0.0 ) ? 1.0 : -1.0;\n                float line_scale = ( ( offset_line < threshold ) ? -offset_line : step - offset_line ) * line_dir;\n    \n            // get closest corner\n                c.normal = n;\n                c.p1.x = p.x - n.x * normal_scale + n.y * line_scale;\n                c.p1.y = p.y - n.y * normal_scale - n.x * line_scale;\n    \n            // scatter\n                if ( scatter != 0.0 ) {\n    \n                    float off_mag = scatter * threshold * 0.5;\n                    float off_angle = rand( vec2( floor( c.p1.x ), floor( c.p1.y ) ) ) * PI2;\n                    c.p1.x += cos( off_angle ) * off_mag;\n                    c.p1.y += sin( off_angle ) * off_mag;\n    \n                }\n    \n            // find corners\n                float normal_step = normal_dir * ( ( offset_normal < threshold ) ? step : -step );\n                float line_step = line_dir * ( ( offset_line < threshold ) ? step : -step );\n                c.p2.x = c.p1.x - n.x * normal_step;\n                c.p2.y = c.p1.y - n.y * normal_step;\n                c.p3.x = c.p1.x + n.y * line_step;\n                c.p3.y = c.p1.y - n.x * line_step;\n                c.p4.x = c.p1.x - n.x * normal_step + n.y * line_step;\n                c.p4.y = c.p1.y - n.y * normal_step - n.x * line_step;\n    \n                return c;\n    \n            }\n    \n            float blendColour( float a, float b, float t ) {\n    \n            // blend colours\n                if ( blendingMode == BLENDING_LINEAR ) {\n                    return blend( a, b, 1.0 - t );\n                } else if ( blendingMode == BLENDING_ADD ) {\n                    return blend( a, min( 1.0, a + b ), t );\n                } else if ( blendingMode == BLENDING_MULTIPLY ) {\n                    return blend( a, max( 0.0, a * b ), t );\n                } else if ( blendingMode == BLENDING_LIGHTER ) {\n                    return blend( a, max( a, b ), t );\n                } else if ( blendingMode == BLENDING_DARKER ) {\n                    return blend( a, min( a, b ), t );\n                } else {\n                    return blend( a, b, 1.0 - t );\n                }\n    \n            }\n    \n            void main() {\n    \n                if ( ! disable ) {\n    \n            // setup\n                    vec2 p = vec2( vUV.x * width, vUV.y * height );\n                    vec2 origin = vec2( 0, 0 );\n                    float aa = ( radius < 2.5 ) ? radius * 0.5 : 1.25;\n    \n            // get channel samples\n                    Cell cell_r = getReferenceCell( p, origin, rotateR, radius );\n                    Cell cell_g = getReferenceCell( p, origin, rotateG, radius );\n                    Cell cell_b = getReferenceCell( p, origin, rotateB, radius );\n                    float r = getDotColour( cell_r, p, 0, rotateR, aa );\n                    float g = getDotColour( cell_g, p, 1, rotateG, aa );\n                    float b = getDotColour( cell_b, p, 2, rotateB, aa );\n    \n            // blend with original\n                    vec4 colour = texture2D( tDiffuse, vUV );\n                    r = blendColour( r, colour.r, blending );\n                    g = blendColour( g, colour.g, blending );\n                    b = blendColour( b, colour.b, blending );\n    \n                    if ( greyscale ) {\n                        r = g = b = (r + b + g) / 3.0;\n                    }\n    \n                    gl_FragColor = vec4( r, g, b, 1.0 );\n    \n                } else {\n    \n                    gl_FragColor = texture2D( tDiffuse, vUV );\n    \n                }\n    \n            }",
};
class HalftonePass extends Pass {
  constructor(e, t, n) {
    super(),
      (this.uniforms = UniformsUtils.clone(HalftoneShader.uniforms)),
      (this.material = new ShaderMaterial({
        uniforms: this.uniforms,
        fragmentShader: HalftoneShader.fragmentShader,
        vertexShader: HalftoneShader.vertexShader,
      })),
      (this.uniforms.width.value = e),
      (this.uniforms.height.value = t);
    for (const e in n)
      n.hasOwnProperty(e) &&
        this.uniforms.hasOwnProperty(e) &&
        (this.uniforms[e].value = n[e]);
    this.fsQuad = new FullScreenQuad(this.material);
  }
  render(e, t, n) {
    (this.material.uniforms.tDiffuse.value = n.texture),
      this.renderToScreen
        ? (e.setRenderTarget(null), this.fsQuad.render(e))
        : (e.setRenderTarget(t),
          this.clear && e.clear(),
          this.fsQuad.render(e));
  }
  setSize(e, t) {
    (this.uniforms.width.value = e), (this.uniforms.height.value = t);
  }
  dispose() {
    this.material.dispose(), this.fsQuad.dispose();
  }
}
const FilmShader = {
    name: "FilmShader",
    uniforms: {
      tDiffuse: { value: null },
      time: { value: 0 },
      nIntensity: { value: 0.5 },
      sIntensity: { value: 0.05 },
      sCount: { value: 4096 },
      grayscale: { value: 1 },
    },
    vertexShader:
      "\n    \n            varying vec2 vUv;\n    \n            void main() {\n    \n                vUv = uv;\n                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n    \n            }",
    fragmentShader:
      "\n    \n            #include <common>\n    \n            // control parameter\n            uniform float time;\n    \n            uniform bool grayscale;\n    \n            // noise effect intensity value (0 = no effect, 1 = full effect)\n            uniform float nIntensity;\n    \n            // scanlines effect intensity value (0 = no effect, 1 = full effect)\n            uniform float sIntensity;\n    \n            // scanlines effect count value (0 = no effect, 4096 = full effect)\n            uniform float sCount;\n    \n            uniform sampler2D tDiffuse;\n    \n            varying vec2 vUv;\n    \n            void main() {\n    \n            // sample the source\n                vec4 cTextureScreen = texture2D( tDiffuse, vUv );\n    \n            // make some noise\n                float dx = rand( vUv + time );\n    \n            // add noise\n                vec3 cResult = cTextureScreen.rgb + cTextureScreen.rgb * clamp( 0.1 + dx, 0.0, 1.0 );\n    \n            // get us a sine and cosine\n                vec2 sc = vec2( sin( vUv.y * sCount ), cos( vUv.y * sCount ) );\n    \n            // add scanlines\n                cResult += cTextureScreen.rgb * vec3( sc.x, sc.y, sc.x ) * sIntensity;\n    \n            // interpolate between source and result by intensity\n                cResult = cTextureScreen.rgb + clamp( nIntensity, 0.0,1.0 ) * ( cResult - cTextureScreen.rgb );\n    \n            // convert to grayscale if desired\n                if( grayscale ) {\n    \n                    cResult = vec3( cResult.r * 0.3 + cResult.g * 0.59 + cResult.b * 0.11 );\n    \n                }\n    \n                gl_FragColor =  vec4( cResult, cTextureScreen.a );\n    \n            }",
  },
  VignetteShader = {
    name: "VignetteShader",
    uniforms: {
      tDiffuse: { value: null },
      offset: { value: 1 },
      darkness: { value: 1 },
    },
    vertexShader:
      "\n    \n            varying vec2 vUv;\n    \n            void main() {\n    \n                vUv = uv;\n                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n    \n            }",
    fragmentShader:
      "\n    \n            uniform float offset;\n            uniform float darkness;\n    \n            uniform sampler2D tDiffuse;\n    \n            varying vec2 vUv;\n    \n            void main() {\n                // Eskil's vignette\n                vec4 texel = texture2D( tDiffuse, vUv );\n                vec2 uv = ( vUv - vec2( 0.5 ) ) * vec2( offset );\n                gl_FragColor = vec4( mix( texel.rgb, vec3( 1.0 - darkness ), dot( uv, uv ) ), texel.a );\n    \n            }",
  };
class FilmPass extends Pass {
  constructor(e, t, n, r) {
    super();
    const i = FilmShader;
    (this.uniforms = UniformsUtils.clone(i.uniforms)),
      (this.material = new ShaderMaterial({
        name: i.name,
        uniforms: this.uniforms,
        vertexShader: i.vertexShader,
        fragmentShader: i.fragmentShader,
      })),
      void 0 !== r && (this.uniforms.grayscale.value = r),
      void 0 !== e && (this.uniforms.nIntensity.value = e),
      void 0 !== t && (this.uniforms.sIntensity.value = t),
      void 0 !== n && (this.uniforms.sCount.value = n),
      (this.fsQuad = new FullScreenQuad(this.material));
  }
  render(e, t, n, r) {
    (this.uniforms.tDiffuse.value = n.texture),
      (this.uniforms.time.value += r),
      this.renderToScreen
        ? (e.setRenderTarget(null), this.fsQuad.render(e))
        : (e.setRenderTarget(t),
          this.clear && e.clear(),
          this.fsQuad.render(e));
  }
  dispose() {
    this.material.dispose(), this.fsQuad.dispose();
  }
}
const MeshNormalMaterial = THREE.MeshNormalMaterial,
  Vector4 = THREE.Vector4,
  DepthTexture = THREE.DepthTexture,
  NearestFilter = THREE.NearestFilter;
class RenderPixelatedPass extends Pass {
  constructor(e, t, n, r = {}) {
    super(),
      (this.pixelSize = e),
      (this.resolution = new Vector2()),
      (this.renderResolution = new Vector2()),
      (this.pixelatedMaterial = this.createPixelatedMaterial()),
      (this.normalMaterial = new MeshNormalMaterial()),
      (this.fsQuad = new FullScreenQuad(this.pixelatedMaterial)),
      (this.scene = t),
      (this.camera = n),
      (this.normalEdgeStrength = r.normalEdgeStrength || 0.3),
      (this.depthEdgeStrength = r.depthEdgeStrength || 0.4),
      (this.beautyRenderTarget = new WebGLRenderTarget()),
      (this.beautyRenderTarget.texture.minFilter = NearestFilter),
      (this.beautyRenderTarget.texture.magFilter = NearestFilter),
      (this.beautyRenderTarget.texture.type = HalfFloatType),
      (this.beautyRenderTarget.depthTexture = new DepthTexture()),
      (this.normalRenderTarget = new WebGLRenderTarget()),
      (this.normalRenderTarget.texture.minFilter = NearestFilter),
      (this.normalRenderTarget.texture.magFilter = NearestFilter),
      (this.normalRenderTarget.texture.type = HalfFloatType);
  }
  dispose() {
    this.beautyRenderTarget.dispose(),
      this.normalRenderTarget.dispose(),
      this.pixelatedMaterial.dispose(),
      this.normalMaterial.dispose(),
      this.fsQuad.dispose();
  }
  setSize(e, t) {
    this.resolution.set(e, t),
      this.renderResolution.set(
        (e / this.pixelSize) | 0,
        (t / this.pixelSize) | 0
      );
    const { x: n, y: r } = this.renderResolution;
    this.beautyRenderTarget.setSize(n, r),
      this.normalRenderTarget.setSize(n, r),
      this.fsQuad.material.uniforms.resolution.value.set(n, r, 1 / n, 1 / r);
  }
  setPixelSize(e) {
    (this.pixelSize = e), this.setSize(this.resolution.x, this.resolution.y);
  }
  render(e, t) {
    const n = this.fsQuad.material.uniforms;
    (n.normalEdgeStrength.value = this.normalEdgeStrength),
      (n.depthEdgeStrength.value = this.depthEdgeStrength),
      e.setRenderTarget(this.beautyRenderTarget),
      e.render(this.scene, this.camera);
    const r = this.scene.overrideMaterial;
    e.setRenderTarget(this.normalRenderTarget),
      (this.scene.overrideMaterial = this.normalMaterial),
      e.render(this.scene, this.camera),
      (this.scene.overrideMaterial = r),
      (n.tDiffuse.value = this.beautyRenderTarget.texture),
      (n.tDepth.value = this.beautyRenderTarget.depthTexture),
      (n.tNormal.value = this.normalRenderTarget.texture),
      this.renderToScreen
        ? e.setRenderTarget(null)
        : (e.setRenderTarget(t), this.clear && e.clear()),
      this.fsQuad.render(e);
  }
  createPixelatedMaterial() {
    return new ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        tNormal: { value: null },
        resolution: {
          value: new Vector4(
            this.renderResolution.x,
            this.renderResolution.y,
            1 / this.renderResolution.x,
            1 / this.renderResolution.y
          ),
        },
        normalEdgeStrength: { value: 0 },
        depthEdgeStrength: { value: 0 },
      },
      vertexShader:
        "\n                    varying vec2 vUv;\n    \n                    void main() {\n    \n                        vUv = uv;\n                        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n    \n                    }\n                ",
      fragmentShader:
        "\n                    uniform sampler2D tDiffuse;\n                    uniform sampler2D tDepth;\n                    uniform sampler2D tNormal;\n                    uniform vec4 resolution;\n                    uniform float normalEdgeStrength;\n                    uniform float depthEdgeStrength;\n                    varying vec2 vUv;\n    \n                    float getDepth(int x, int y) {\n    \n                        return texture2D( tDepth, vUv + vec2(x, y) * resolution.zw ).r;\n    \n                    }\n    \n                    vec3 getNormal(int x, int y) {\n    \n                        return texture2D( tNormal, vUv + vec2(x, y) * resolution.zw ).rgb * 2.0 - 1.0;\n    \n                    }\n    \n                    float depthEdgeIndicator(float depth, vec3 normal) {\n    \n                        float diff = 0.0;\n                        diff += clamp(getDepth(1, 0) - depth, 0.0, 1.0);\n                        diff += clamp(getDepth(-1, 0) - depth, 0.0, 1.0);\n                        diff += clamp(getDepth(0, 1) - depth, 0.0, 1.0);\n                        diff += clamp(getDepth(0, -1) - depth, 0.0, 1.0);\n                        return floor(smoothstep(0.01, 0.02, diff) * 2.) / 2.;\n    \n                    }\n    \n                    float neighborNormalEdgeIndicator(int x, int y, float depth, vec3 normal) {\n    \n                        float depthDiff = getDepth(x, y) - depth;\n                        vec3 neighborNormal = getNormal(x, y);\n    \n                        // Edge pixels should yield to faces who's normals are closer to the bias normal.\n                        vec3 normalEdgeBias = vec3(1., 1., 1.); // This should probably be a parameter.\n                        float normalDiff = dot(normal - neighborNormal, normalEdgeBias);\n                        float normalIndicator = clamp(smoothstep(-.01, .01, normalDiff), 0.0, 1.0);\n    \n                        // Only the shallower pixel should detect the normal edge.\n                        float depthIndicator = clamp(sign(depthDiff * .25 + .0025), 0.0, 1.0);\n    \n                        return (1.0 - dot(normal, neighborNormal)) * depthIndicator * normalIndicator;\n    \n                    }\n    \n                    float normalEdgeIndicator(float depth, vec3 normal) {\n    \n                        float indicator = 0.0;\n    \n                        indicator += neighborNormalEdgeIndicator(0, -1, depth, normal);\n                        indicator += neighborNormalEdgeIndicator(0, 1, depth, normal);\n                        indicator += neighborNormalEdgeIndicator(-1, 0, depth, normal);\n                        indicator += neighborNormalEdgeIndicator(1, 0, depth, normal);\n    \n                        return step(0.1, indicator);\n    \n                    }\n    \n                    void main() {\n    \n                        vec4 texel = texture2D( tDiffuse, vUv );\n    \n                        float depth = 0.0;\n                        vec3 normal = vec3(0.0);\n    \n                        if (depthEdgeStrength > 0.0 || normalEdgeStrength > 0.0) {\n    \n                            depth = getDepth(0, 0);\n                            normal = getNormal(0, 0);\n    \n                        }\n    \n                        float dei = 0.0;\n                        if (depthEdgeStrength > 0.0)\n                            dei = depthEdgeIndicator(depth, normal);\n    \n                        float nei = 0.0;\n                        if (normalEdgeStrength > 0.0)\n                            nei = normalEdgeIndicator(depth, normal);\n    \n                        float Strength = dei > 0.0 ? (1.0 - depthEdgeStrength * dei) : (1.0 + normalEdgeStrength * nei);\n    \n                        gl_FragColor = texel * Strength;\n    \n                    }\n                ",
    });
  }
}
const GammaCorrectionShader = {
    name: "GammaCorrectionShader",
    uniforms: { tDiffuse: { value: null } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      varying vec2 vUv;
  
      // Manually define LinearTosRGB
      vec3 LinearTosRGB(vec3 color) {
        return pow(color, vec3(1.0 / 2.2));
      }
  
      void main() {
        vec4 tex = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(LinearTosRGB(tex.rgb), tex.a);
      }
    `,
  },
  DigitalGlitch = {
    uniforms: {
      tDiffuse: { value: null },
      tDisp: { value: null },
      byp: { value: 0 },
      amount: { value: 0.08 },
      angle: { value: 0.02 },
      seed: { value: 0.02 },
      seed_x: { value: 0.02 },
      seed_y: { value: 0.02 },
      distortion_x: { value: 0.5 },
      distortion_y: { value: 0.6 },
      col_s: { value: 0.05 },
    },
    vertexShader:
      "\n    \n            varying vec2 vUv;\n            void main() {\n                vUv = uv;\n                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n            }",
    fragmentShader:
      "\n    \n            uniform int byp; //should we apply the glitch ?\n    \n            uniform sampler2D tDiffuse;\n            uniform sampler2D tDisp;\n    \n            uniform float amount;\n            uniform float angle;\n            uniform float seed;\n            uniform float seed_x;\n            uniform float seed_y;\n            uniform float distortion_x;\n            uniform float distortion_y;\n            uniform float col_s;\n    \n            varying vec2 vUv;\n    \n    \n            float rand(vec2 co){\n                return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n            }\n    \n            void main() {\n                if(byp<1) {\n                    vec2 p = vUv;\n                    float xs = floor(gl_FragCoord.x / 0.5);\n                    float ys = floor(gl_FragCoord.y / 0.5);\n                    //based on staffantans glitch shader for unity https://github.com/staffantan/unityglitch\n                    float disp = texture2D(tDisp, p*seed*seed).r;\n                    if(p.y<distortion_x+col_s && p.y>distortion_x-col_s*seed) {\n                        if(seed_x>0.){\n                            p.y = 1. - (p.y + distortion_y);\n                        }\n                        else {\n                            p.y = distortion_y;\n                        }\n                    }\n                    if(p.x<distortion_y+col_s && p.x>distortion_y-col_s*seed) {\n                        if(seed_y>0.){\n                            p.x=distortion_x;\n                        }\n                        else {\n                            p.x = 1. - (p.x + distortion_x);\n                        }\n                    }\n                    p.x+=disp*seed_x*(seed/5.);\n                    p.y+=disp*seed_y*(seed/5.);\n                    //base from RGB shift shader\n                    vec2 offset = amount * vec2( cos(angle), sin(angle));\n                    vec4 cr = texture2D(tDiffuse, p + offset);\n                    vec4 cga = texture2D(tDiffuse, p);\n                    vec4 cb = texture2D(tDiffuse, p - offset);\n                    gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a);\n                    //add noise\n                    vec4 snow = 200.*amount*vec4(rand(vec2(xs * seed,ys * seed*50.))*0.2);\n                    gl_FragColor = gl_FragColor+ snow;\n                }\n                else {\n                    gl_FragColor=texture2D (tDiffuse, vUv);\n                }\n            }",
  },
  DataTexture = THREE.DataTexture,
  FloatType = THREE.FloatType,
  MathUtils = THREE.MathUtils,
  RedFormat = THREE.RedFormat,
  LuminanceFormat = THREE.LuminanceFormat;
class GlitchPass extends Pass {
  constructor(e = 64) {
    super();
    const t = DigitalGlitch;
    (this.uniforms = UniformsUtils.clone(t.uniforms)),
      (this.heightMap = this.generateHeightmap(e)),
      (this.uniforms.tDisp.value = this.heightMap),
      (this.material = new ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: t.vertexShader,
        fragmentShader: t.fragmentShader,
      })),
      (this.fsQuad = new FullScreenQuad(this.material)),
      (this.goWild = !1),
      (this.curF = 0),
      this.generateTrigger();
  }
  render(e, t, n) {
    !1 === e.capabilities.isWebGL2 &&
      (this.uniforms.tDisp.value.format = LuminanceFormat),
      (this.uniforms.tDiffuse.value = n.texture),
      (this.uniforms.seed.value = Math.random()),
      (this.uniforms.byp.value = 0),
      this.curF % this.randX == 0 || 1 == this.goWild
        ? ((this.uniforms.amount.value = Math.random() / 30),
          (this.uniforms.angle.value = MathUtils.randFloat(-Math.PI, Math.PI)),
          (this.uniforms.seed_x.value = MathUtils.randFloat(-1, 1)),
          (this.uniforms.seed_y.value = MathUtils.randFloat(-1, 1)),
          (this.uniforms.distortion_x.value = MathUtils.randFloat(0, 1)),
          (this.uniforms.distortion_y.value = MathUtils.randFloat(0, 1)),
          (this.curF = 0),
          this.generateTrigger())
        : this.curF % this.randX < this.randX / 5
        ? ((this.uniforms.amount.value = Math.random() / 90),
          (this.uniforms.angle.value = MathUtils.randFloat(-Math.PI, Math.PI)),
          (this.uniforms.distortion_x.value = MathUtils.randFloat(0, 1)),
          (this.uniforms.distortion_y.value = MathUtils.randFloat(0, 1)),
          (this.uniforms.seed_x.value = MathUtils.randFloat(-0.3, 0.3)),
          (this.uniforms.seed_y.value = MathUtils.randFloat(-0.3, 0.3)))
        : 0 == this.goWild && (this.uniforms.byp.value = 1),
      this.curF++,
      this.renderToScreen
        ? (e.setRenderTarget(null), this.fsQuad.render(e))
        : (e.setRenderTarget(t),
          this.clear && e.clear(),
          this.fsQuad.render(e));
  }
  generateTrigger() {
    this.randX = MathUtils.randInt(120, 240);
  }
  generateHeightmap(e) {
    const t = new Float32Array(e * e),
      n = e * e;
    for (let e = 0; e < n; e++) {
      const n = MathUtils.randFloat(0, 1);
      t[e] = n;
    }
    const r = new DataTexture(t, e, e, RedFormat, FloatType);
    return (r.needsUpdate = !0), r;
  }
  dispose() {
    this.material.dispose(), this.heightMap.dispose(), this.fsQuad.dispose();
  }
}
const LuminosityShader = {
    uniforms: { tDiffuse: { value: null } },
    vertexShader:
      "\n    \n            varying vec2 vUv;\n    \n            void main() {\n    \n                vUv = uv;\n    \n                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n    \n            }",
    fragmentShader:
      "\n    \n            #include <common>\n    \n            uniform sampler2D tDiffuse;\n    \n            varying vec2 vUv;\n    \n            void main() {\n    \n                vec4 texel = texture2D( tDiffuse, vUv );\n    \n                float l = luminance( texel.rgb );\n    \n                gl_FragColor = vec4( l, l, l, texel.w );\n    \n            }",
  },
  SobelOperatorShader = {
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new Vector2() },
    },
    vertexShader:
      "\n    \n            varying vec2 vUv;\n    \n            void main() {\n    \n                vUv = uv;\n    \n                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n    \n            }",
    fragmentShader:
      "\n    \n            uniform sampler2D tDiffuse;\n            uniform vec2 resolution;\n            varying vec2 vUv;\n    \n            void main() {\n    \n                vec2 texel = vec2( 1.0 / resolution.x, 1.0 / resolution.y );\n    \n            // kernel definition (in glsl matrices are filled in column-major order)\n    \n                const mat3 Gx = mat3( -1, -2, -1, 0, 0, 0, 1, 2, 1 ); // x direction kernel\n                const mat3 Gy = mat3( -1, 0, 1, -2, 0, 2, -1, 0, 1 ); // y direction kernel\n    \n            // fetch the 3x3 neighbourhood of a fragment\n    \n            // first column\n    \n                float tx0y0 = texture2D( tDiffuse, vUv + texel * vec2( -1, -1 ) ).r;\n                float tx0y1 = texture2D( tDiffuse, vUv + texel * vec2( -1,  0 ) ).r;\n                float tx0y2 = texture2D( tDiffuse, vUv + texel * vec2( -1,  1 ) ).r;\n    \n            // second column\n    \n                float tx1y0 = texture2D( tDiffuse, vUv + texel * vec2(  0, -1 ) ).r;\n                float tx1y1 = texture2D( tDiffuse, vUv + texel * vec2(  0,  0 ) ).r;\n                float tx1y2 = texture2D( tDiffuse, vUv + texel * vec2(  0,  1 ) ).r;\n    \n            // third column\n    \n                float tx2y0 = texture2D( tDiffuse, vUv + texel * vec2(  1, -1 ) ).r;\n                float tx2y1 = texture2D( tDiffuse, vUv + texel * vec2(  1,  0 ) ).r;\n                float tx2y2 = texture2D( tDiffuse, vUv + texel * vec2(  1,  1 ) ).r;\n    \n            // gradient value in x direction\n    \n                float valueGx = Gx[0][0] * tx0y0 + Gx[1][0] * tx1y0 + Gx[2][0] * tx2y0 +\n                    Gx[0][1] * tx0y1 + Gx[1][1] * tx1y1 + Gx[2][1] * tx2y1 +\n                    Gx[0][2] * tx0y2 + Gx[1][2] * tx1y2 + Gx[2][2] * tx2y2;\n    \n            // gradient value in y direction\n    \n                float valueGy = Gy[0][0] * tx0y0 + Gy[1][0] * tx1y0 + Gy[2][0] * tx2y0 +\n                    Gy[0][1] * tx0y1 + Gy[1][1] * tx1y1 + Gy[2][1] * tx2y1 +\n                    Gy[0][2] * tx0y2 + Gy[1][2] * tx1y2 + Gy[2][2] * tx2y2;\n    \n            // magnitute of the total gradient\n    \n                float G = sqrt( ( valueGx * valueGx ) + ( valueGy * valueGy ) );\n    \n                gl_FragColor = vec4( vec3( G ), 1 );\n    \n            }",
  },
  LuminosityHighPassShader = {
    shaderID: "luminosityHighPass",
    uniforms: {
      tDiffuse: { value: null },
      luminosityThreshold: { value: 1 },
      smoothWidth: { value: 1 },
      defaultColor: { value: new Color(0) },
      defaultOpacity: { value: 0 },
    },
    vertexShader:
      "\n    \n            varying vec2 vUv;\n    \n            void main() {\n    \n                vUv = uv;\n    \n                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n    \n            }",
    fragmentShader:
      "\n    \n            uniform sampler2D tDiffuse;\n            uniform vec3 defaultColor;\n            uniform float defaultOpacity;\n            uniform float luminosityThreshold;\n            uniform float smoothWidth;\n    \n            varying vec2 vUv;\n    \n            void main() {\n    \n                vec4 texel = texture2D( tDiffuse, vUv );\n    \n                vec3 luma = vec3( 0.299, 0.587, 0.114 );\n    \n                float v = dot( texel.xyz, luma );\n    \n                vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );\n    \n                float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );\n    \n                gl_FragColor = mix( outputColor, texel, alpha );\n    \n            }",
  },
  AdditiveBlending = THREE.AdditiveBlending,
  MeshBasicMaterial = THREE.MeshBasicMaterial,
  Vector3 = THREE.Vector3;
class UnrealBloomPass extends Pass {
  constructor(e, t, n, r) {
    super(),
      (this.strength = void 0 !== t ? t : 1),
      (this.radius = n),
      (this.threshold = r),
      (this.resolution =
        void 0 !== e ? new Vector2(e.x, e.y) : new Vector2(256, 256)),
      (this.clearColor = new Color(0, 0, 0)),
      (this.renderTargetsHorizontal = []),
      (this.renderTargetsVertical = []),
      (this.nMips = 5);
    let i = Math.round(this.resolution.x / 2),
      s = Math.round(this.resolution.y / 2);
    (this.renderTargetBright = new WebGLRenderTarget(i, s, {
      type: HalfFloatType,
    })),
      (this.renderTargetBright.texture.name = "UnrealBloomPass.bright"),
      (this.renderTargetBright.texture.generateMipmaps = !1);
    for (let e = 0; e < this.nMips; e++) {
      const t = new WebGLRenderTarget(i, s, { type: HalfFloatType });
      (t.texture.name = "UnrealBloomPass.h" + e),
        (t.texture.generateMipmaps = !1),
        this.renderTargetsHorizontal.push(t);
      const n = new WebGLRenderTarget(i, s, { type: HalfFloatType });
      (n.texture.name = "UnrealBloomPass.v" + e),
        (n.texture.generateMipmaps = !1),
        this.renderTargetsVertical.push(n),
        (i = Math.round(i / 2)),
        (s = Math.round(s / 2));
    }
    const a = LuminosityHighPassShader;
    (this.highPassUniforms = UniformsUtils.clone(a.uniforms)),
      (this.highPassUniforms.luminosityThreshold.value = r),
      (this.highPassUniforms.smoothWidth.value = 0.01),
      (this.materialHighPassFilter = new ShaderMaterial({
        uniforms: this.highPassUniforms,
        vertexShader: a.vertexShader,
        fragmentShader: a.fragmentShader,
        defines: {},
      })),
      (this.separableBlurMaterials = []);
    const o = [3, 5, 7, 9, 11];
    (i = Math.round(this.resolution.x / 2)),
      (s = Math.round(this.resolution.y / 2));
    for (let e = 0; e < this.nMips; e++)
      this.separableBlurMaterials.push(this.getSeperableBlurMaterial(o[e])),
        (this.separableBlurMaterials[e].uniforms.texSize.value = new Vector2(
          i,
          s
        )),
        (i = Math.round(i / 2)),
        (s = Math.round(s / 2));
    (this.compositeMaterial = this.getCompositeMaterial(this.nMips)),
      (this.compositeMaterial.uniforms.blurTexture1.value =
        this.renderTargetsVertical[0].texture),
      (this.compositeMaterial.uniforms.blurTexture2.value =
        this.renderTargetsVertical[1].texture),
      (this.compositeMaterial.uniforms.blurTexture3.value =
        this.renderTargetsVertical[2].texture),
      (this.compositeMaterial.uniforms.blurTexture4.value =
        this.renderTargetsVertical[3].texture),
      (this.compositeMaterial.uniforms.blurTexture5.value =
        this.renderTargetsVertical[4].texture),
      (this.compositeMaterial.uniforms.bloomStrength.value = t),
      (this.compositeMaterial.uniforms.bloomRadius.value = 0.1),
      (this.compositeMaterial.needsUpdate = !0);
    (this.compositeMaterial.uniforms.bloomFactors.value = [
      1, 0.8, 0.6, 0.4, 0.2,
    ]),
      (this.bloomTintColors = [
        new Vector3(1, 1, 1),
        new Vector3(1, 1, 1),
        new Vector3(1, 1, 1),
        new Vector3(1, 1, 1),
        new Vector3(1, 1, 1),
      ]),
      (this.compositeMaterial.uniforms.bloomTintColors.value =
        this.bloomTintColors);
    const l = CopyShader;
    (this.copyUniforms = UniformsUtils.clone(l.uniforms)),
      (this.copyUniforms.opacity.value = 1),
      (this.materialCopy = new ShaderMaterial({
        uniforms: this.copyUniforms,
        vertexShader: l.vertexShader,
        fragmentShader: l.fragmentShader,
        blending: AdditiveBlending,
        depthTest: !1,
        depthWrite: !1,
        transparent: !0,
      })),
      (this.enabled = !0),
      (this.needsSwap = !1),
      (this._oldClearColor = new Color()),
      (this.oldClearAlpha = 1),
      (this.basic = new MeshBasicMaterial()),
      (this.fsQuad = new FullScreenQuad(null));
  }
  dispose() {
    for (let e = 0; e < this.renderTargetsHorizontal.length; e++)
      this.renderTargetsHorizontal[e].dispose();
    for (let e = 0; e < this.renderTargetsVertical.length; e++)
      this.renderTargetsVertical[e].dispose();
    this.renderTargetBright.dispose();
    for (let e = 0; e < this.separableBlurMaterials.length; e++)
      this.separableBlurMaterials[e].dispose();
    this.compositeMaterial.dispose(),
      this.materialCopy.dispose(),
      this.basic.dispose(),
      this.fsQuad.dispose();
  }
  setSize(e, t) {
    let n = Math.round(e / 2),
      r = Math.round(t / 2);
    this.renderTargetBright.setSize(n, r);
    for (let e = 0; e < this.nMips; e++)
      this.renderTargetsHorizontal[e].setSize(n, r),
        this.renderTargetsVertical[e].setSize(n, r),
        (this.separableBlurMaterials[e].uniforms.texSize.value = new Vector2(
          n,
          r
        )),
        (n = Math.round(n / 2)),
        (r = Math.round(r / 2));
  }
  render(e, t, n, r, i) {
    e.getClearColor(this._oldClearColor),
      (this.oldClearAlpha = e.getClearAlpha());
    const s = e.autoClear;
    (e.autoClear = !1),
      e.setClearColor(this.clearColor, 0),
      i && e.state.buffers.stencil.setTest(!1),
      this.renderToScreen &&
        ((this.fsQuad.material = this.basic),
        (this.basic.map = n.texture),
        e.setRenderTarget(null),
        e.clear(),
        this.fsQuad.render(e)),
      (this.highPassUniforms.tDiffuse.value = n.texture),
      (this.highPassUniforms.luminosityThreshold.value = this.threshold),
      (this.fsQuad.material = this.materialHighPassFilter),
      e.setRenderTarget(this.renderTargetBright),
      e.clear(),
      this.fsQuad.render(e);
    let a = this.renderTargetBright;
    for (let t = 0; t < this.nMips; t++)
      (this.fsQuad.material = this.separableBlurMaterials[t]),
        (this.separableBlurMaterials[t].uniforms.colorTexture.value =
          a.texture),
        (this.separableBlurMaterials[t].uniforms.direction.value =
          UnrealBloomPass.BlurDirectionX),
        e.setRenderTarget(this.renderTargetsHorizontal[t]),
        e.clear(),
        this.fsQuad.render(e),
        (this.separableBlurMaterials[t].uniforms.colorTexture.value =
          this.renderTargetsHorizontal[t].texture),
        (this.separableBlurMaterials[t].uniforms.direction.value =
          UnrealBloomPass.BlurDirectionY),
        e.setRenderTarget(this.renderTargetsVertical[t]),
        e.clear(),
        this.fsQuad.render(e),
        (a = this.renderTargetsVertical[t]);
    (this.fsQuad.material = this.compositeMaterial),
      (this.compositeMaterial.uniforms.bloomStrength.value = this.strength),
      (this.compositeMaterial.uniforms.bloomRadius.value = this.radius),
      (this.compositeMaterial.uniforms.bloomTintColors.value =
        this.bloomTintColors),
      e.setRenderTarget(this.renderTargetsHorizontal[0]),
      e.clear(),
      this.fsQuad.render(e),
      (this.fsQuad.material = this.materialCopy),
      (this.copyUniforms.tDiffuse.value =
        this.renderTargetsHorizontal[0].texture),
      i && e.state.buffers.stencil.setTest(!0),
      this.renderToScreen
        ? (e.setRenderTarget(null), this.fsQuad.render(e))
        : (e.setRenderTarget(n), this.fsQuad.render(e)),
      e.setClearColor(this._oldClearColor, this.oldClearAlpha),
      (e.autoClear = s);
  }
  getSeperableBlurMaterial(e) {
    return new ShaderMaterial({
      defines: { KERNEL_RADIUS: e, SIGMA: e },
      uniforms: {
        colorTexture: { value: null },
        texSize: { value: new Vector2(0.5, 0.5) },
        direction: { value: new Vector2(0.5, 0.5) },
      },
      vertexShader:
        "varying vec2 vUv;\n                    void main() {\n                        vUv = uv;\n                        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n                    }",
      fragmentShader:
        "#include <common>\n                    varying vec2 vUv;\n                    uniform sampler2D colorTexture;\n                    uniform vec2 texSize;\n                    uniform vec2 direction;\n    \n                    float gaussianPdf(in float x, in float sigma) {\n                        return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;\n                    }\n                    void main() {\n                        vec2 invSize = 1.0 / texSize;\n                        float fSigma = float(SIGMA);\n                        float weightSum = gaussianPdf(0.0, fSigma);\n                        vec3 diffuseSum = texture2D( colorTexture, vUv).rgb * weightSum;\n                        for( int i = 1; i < KERNEL_RADIUS; i ++ ) {\n                            float x = float(i);\n                            float w = gaussianPdf(x, fSigma);\n                            vec2 uvOffset = direction * invSize * x;\n                            vec3 sample1 = texture2D( colorTexture, vUv + uvOffset).rgb;\n                            vec3 sample2 = texture2D( colorTexture, vUv - uvOffset).rgb;\n                            diffuseSum += (sample1 + sample2) * w;\n                            weightSum += 2.0 * w;\n                        }\n                        gl_FragColor = vec4(diffuseSum/weightSum, 1.0);\n                    }",
    });
  }
  getCompositeMaterial(e) {
    return new ShaderMaterial({
      defines: { NUM_MIPS: e },
      uniforms: {
        blurTexture1: { value: null },
        blurTexture2: { value: null },
        blurTexture3: { value: null },
        blurTexture4: { value: null },
        blurTexture5: { value: null },
        bloomStrength: { value: 1 },
        bloomFactors: { value: null },
        bloomTintColors: { value: null },
        bloomRadius: { value: 0 },
      },
      vertexShader:
        "varying vec2 vUv;\n                    void main() {\n                        vUv = uv;\n                        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n                    }",
      fragmentShader:
        "varying vec2 vUv;\n                    uniform sampler2D blurTexture1;\n                    uniform sampler2D blurTexture2;\n                    uniform sampler2D blurTexture3;\n                    uniform sampler2D blurTexture4;\n                    uniform sampler2D blurTexture5;\n                    uniform float bloomStrength;\n                    uniform float bloomRadius;\n                    uniform float bloomFactors[NUM_MIPS];\n                    uniform vec3 bloomTintColors[NUM_MIPS];\n    \n                    float lerpBloomFactor(const in float factor) {\n                        float mirrorFactor = 1.2 - factor;\n                        return mix(factor, mirrorFactor, bloomRadius);\n                    }\n    \n                    void main() {\n                        gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +\n                            lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +\n                            lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +\n                            lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +\n                            lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );\n                    }",
    });
  }
}
(UnrealBloomPass.BlurDirectionX = new Vector2(1, 0)),
  (UnrealBloomPass.BlurDirectionY = new Vector2(0, 1));
const OutputShader = {
    uniforms: { tDiffuse: { value: null }, toneMappingExposure: { value: 1 } },
    vertexShader:
      "\n    \n            varying vec2 vUv;\n    \n            void main() {\n    \n                vUv = uv;\n                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n    \n            }",
    fragmentShader: `uniform sampler2D tDiffuse;

#include <tonemapping_pars_fragment>

varying vec2 vUv;

vec3 LinearTosRGB(vec3 color) {
    return pow(color, vec3(1.0 / 2.2));
}

void main() {
    gl_FragColor = texture2D(tDiffuse, vUv);

    // tone mapping
    #ifdef LINEAR_TONE_MAPPING
        gl_FragColor.rgb = LinearToneMapping(gl_FragColor.rgb);
    #elif defined(REINHARD_TONE_MAPPING)
        gl_FragColor.rgb = ReinhardToneMapping(gl_FragColor.rgb);
    #elif defined(CINEON_TONE_MAPPING)
        gl_FragColor.rgb = OptimizedCineonToneMapping(gl_FragColor.rgb);
    #elif defined(ACES_FILMIC_TONE_MAPPING)
        gl_FragColor.rgb = ACESFilmicToneMapping(gl_FragColor.rgb);
    #endif

    // color space
    gl_FragColor.rgb = LinearTosRGB(gl_FragColor.rgb);
}`,
  },
  NoToneMapping = THREE.NoToneMapping,
  LinearToneMapping = THREE.LinearToneMapping,
  ReinhardToneMapping = THREE.ReinhardToneMapping,
  CineonToneMapping = THREE.CineonToneMapping,
  ACESFilmicToneMapping = THREE.ACESFilmicToneMapping;
class OutputPass extends Pass {
  constructor(e = NoToneMapping, t = 1) {
    super(), (this.toneMapping = e), (this.toneMappingExposure = t);
    const n = OutputShader;
    (this.uniforms = UniformsUtils.clone(n.uniforms)),
      (this.material = new ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: n.vertexShader,
        fragmentShader: n.fragmentShader,
      })),
      e === LinearToneMapping
        ? (this.material.defines.LINEAR_TONE_MAPPING = "")
        : e === ReinhardToneMapping
        ? (this.material.defines.REINHARD_TONE_MAPPING = "")
        : e === CineonToneMapping
        ? (this.material.defines.CINEON_TONE_MAPPING = "")
        : e === ACESFilmicToneMapping &&
          (this.material.defines.ACES_FILMIC_TONE_MAPPING = ""),
      (this.fsQuad = new FullScreenQuad(this.material));
  }
  render(e, t, n) {
    (this.uniforms.tDiffuse.value = n.texture),
      (this.uniforms.toneMappingExposure.value = this.toneMappingExposure),
      !0 === this.renderToScreen
        ? (e.setRenderTarget(null), this.fsQuad.render(e))
        : (e.setRenderTarget(t),
          this.clear &&
            e.clear(e.autoClearColor, e.autoClearDepth, e.autoClearStencil),
          this.fsQuad.render(e));
  }
  dispose() {
    this.material.dispose(), this.fsQuad.dispose();
  }
}
const RGBShiftShader = {
    name: "RGBShiftShader",
    uniforms: {
      tDiffuse: { value: null },
      amount: { value: 0.005 },
      angle: { value: 0 },
    },
    vertexShader:
      "\n  \n          varying vec2 vUv;\n  \n          void main() {\n  \n              vUv = uv;\n              gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n  \n          }",
    fragmentShader:
      "\n  \n          uniform sampler2D tDiffuse;\n          uniform float amount;\n          uniform float angle;\n  \n          varying vec2 vUv;\n  \n          void main() {\n  \n              vec2 offset = amount * vec2( cos(angle), sin(angle));\n              vec4 cr = texture2D(tDiffuse, vUv + offset);\n              vec4 cga = texture2D(tDiffuse, vUv);\n              vec4 cb = texture2D(tDiffuse, vUv - offset);\n              gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a);\n  \n          }",
  },
  DotScreenShader = {
    name: "DotScreenShader",
    uniforms: {
      tDiffuse: { value: null },
      tSize: { value: new Vector2(256, 256) },
      center: { value: new Vector2(0.5, 0.5) },
      angle: { value: 1.57 },
      scale: { value: 1 },
    },
    vertexShader:
      "\n  \n          varying vec2 vUv;\n  \n          void main() {\n  \n              vUv = uv;\n              gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n  \n          }",
    fragmentShader:
      "\n  \n          uniform vec2 center;\n          uniform float angle;\n          uniform float scale;\n          uniform vec2 tSize;\n  \n          uniform sampler2D tDiffuse;\n  \n          varying vec2 vUv;\n  \n          float pattern() {\n  \n              float s = sin( angle ), c = cos( angle );\n  \n              vec2 tex = vUv * tSize - center;\n              vec2 point = vec2( c * tex.x - s * tex.y, s * tex.x + c * tex.y ) * scale;\n  \n              return ( sin( point.x ) * sin( point.y ) ) * 4.0;\n  \n          }\n  \n          void main() {\n  \n              vec4 color = texture2D( tDiffuse, vUv );\n  \n              float average = ( color.r + color.g + color.b ) / 3.0;\n  \n              gl_FragColor = vec4( vec3( average * 10.0 - 5.0 + pattern() ), color.a );\n  \n          }",
  };
class ClearPass extends Pass {
  constructor(e, t) {
    super(),
      (this.needsSwap = !1),
      (this.clearColor = void 0 !== e ? e : 0),
      (this.clearAlpha = void 0 !== t ? t : 0),
      (this._oldClearColor = new Color());
  }
  render(e, t, n) {
    let r;
    this.clearColor &&
      (e.getClearColor(this._oldClearColor),
      (r = e.getClearAlpha()),
      e.setClearColor(this.clearColor, this.clearAlpha)),
      e.setRenderTarget(this.renderToScreen ? null : n),
      e.clear(),
      this.clearColor && e.setClearColor(this._oldClearColor, r);
  }
}
class TexturePass extends Pass {
  constructor(e, t) {
    super();
    const n = CopyShader;
    (this.map = e),
      (this.opacity = void 0 !== t ? t : 1),
      (this.uniforms = UniformsUtils.clone(n.uniforms)),
      (this.material = new ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: n.vertexShader,
        fragmentShader: n.fragmentShader,
        depthTest: !1,
        depthWrite: !1,
      })),
      (this.needsSwap = !1),
      (this.fsQuad = new FullScreenQuad(null));
  }
  render(e, t, n) {
    const r = e.autoClear;
    (e.autoClear = !1),
      (this.fsQuad.material = this.material),
      (this.uniforms.opacity.value = this.opacity),
      (this.uniforms.tDiffuse.value = this.map),
      (this.material.transparent = this.opacity < 1),
      e.setRenderTarget(this.renderToScreen ? null : n),
      this.clear && e.clear(),
      this.fsQuad.render(e),
      (e.autoClear = r);
  }
  dispose() {
    this.material.dispose(), this.fsQuad.dispose();
  }
}
const VolumetericLightShader = {
    uniforms: {
      tDiffuse: { value: null },
      lightPosition: { value: new THREE.Vector2(0.5, 0.5) },
      exposure: { value: 0.15 },
      decay: { value: 0.95 },
      density: { value: 0.5 },
      weight: { value: 0.4 },
      samples: { value: 50 },
    },
    vertexShader: [
      "varying vec2 vUv;",
      "void main() {",
      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
      "}",
    ].join("\n"),
    fragmentShader: [
      "varying vec2 vUv;",
      "uniform sampler2D tDiffuse;",
      "uniform vec2 lightPosition;",
      "uniform float exposure;",
      "uniform float decay;",
      "uniform float density;",
      "uniform float weight;",
      "uniform int samples;",
      "const int MAX_SAMPLES = 100;",
      "void main()",
      "{",
      "vec2 texCoord = vUv;",
      "vec2 deltaTextCoord = texCoord - lightPosition;",
      "deltaTextCoord *= 1.0 / float(samples) * density;",
      "vec4 color = texture2D(tDiffuse, texCoord);",
      "float illuminationDecay = 1.0;",
      "for(int i=0; i < MAX_SAMPLES; i++)",
      "{",
      "if(i == samples){",
      "break;",
      "}",
      "texCoord -= deltaTextCoord;",
      "vec4 sampler = texture2D(tDiffuse, texCoord);",
      "sampler *= illuminationDecay * weight;",
      "color += sampler;",
      "illuminationDecay *= decay;",
      "}",
      "gl_FragColor = color * exposure;",
      "}",
    ].join("\n"),
  },
  AdditiveBlendingShader = {
    uniforms: { tDiffuse: { value: null }, tAdd: { value: null } },
    vertexShader: [
      "varying vec2 vUv;",
      "void main() {",
      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
      "}",
    ].join("\n"),
    fragmentShader: [
      "uniform sampler2D tDiffuse;",
      "uniform sampler2D tAdd;",
      "varying vec2 vUv;",
      "void main() {",
      "vec4 color = texture2D( tDiffuse, vUv );",
      "vec4 add = texture2D( tAdd, vUv );",
      "gl_FragColor = color + add;",
      "}",
    ].join("\n"),
  },
  PassThroughShader = {
    uniforms: { tDiffuse: { value: null } },
    vertexShader: [
      "varying vec2 vUv;",
      "void main() {",
      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
      "}",
    ].join("\n"),
    fragmentShader: [
      "uniform sampler2D tDiffuse;",
      "varying vec2 vUv;",
      "void main() {",
      "gl_FragColor = texture2D( tDiffuse, vec2( vUv.x, vUv.y ) );",
      "}",
    ].join("\n"),
  },
  AfterimageShader = {
    uniforms: {
      damp: { value: 0.96 },
      tOld: { value: null },
      tNew: { value: null },
    },
    vertexShader:
      "\n          varying vec2 vUv;\n          void main() {\n              vUv = uv;\n              gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n          }",
    fragmentShader:
      "\n          uniform float damp;\n          uniform sampler2D tOld;\n          uniform sampler2D tNew;\n          varying vec2 vUv;\n          vec4 when_gt( vec4 x, float y ) {\n              return max( sign( x - y ), 0.0 );\n          }\n          void main() {\n              vec4 texelOld = texture2D( tOld, vUv );\n              vec4 texelNew = texture2D( tNew, vUv );\n              texelOld *= damp * when_gt( texelOld, 0.1 );\n              gl_FragColor = max(texelNew, texelOld);\n          }",
  };
class AfterimagePass extends Pass {
  constructor(e = 0.96) {
    super(),
      (this.shader = AfterimageShader),
      (this.uniforms = UniformsUtils.clone(this.shader.uniforms)),
      (this.uniforms.damp.value = e),
      (this.textureComp = new WebGLRenderTarget(
        window.innerWidth,
        window.innerHeight,
        { magFilter: NearestFilter, type: HalfFloatType }
      )),
      (this.textureOld = new WebGLRenderTarget(
        window.innerWidth,
        window.innerHeight,
        { magFilter: NearestFilter, type: HalfFloatType }
      )),
      (this.compFsMaterial = new ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: this.shader.vertexShader,
        fragmentShader: this.shader.fragmentShader,
      })),
      (this.compFsQuad = new FullScreenQuad(this.compFsMaterial)),
      (this.copyFsMaterial = new MeshBasicMaterial()),
      (this.copyFsQuad = new FullScreenQuad(this.copyFsMaterial));
  }
  render(e, t, n) {
    (this.uniforms.tOld.value = this.textureOld.texture),
      (this.uniforms.tNew.value = n.texture),
      e.setRenderTarget(this.textureComp),
      this.compFsQuad.render(e),
      (this.copyFsQuad.material.map = this.textureComp.texture),
      this.renderToScreen
        ? (e.setRenderTarget(null), this.copyFsQuad.render(e))
        : (e.setRenderTarget(t),
          this.clear && e.clear(),
          this.copyFsQuad.render(e));
    const r = this.textureOld;
    (this.textureOld = this.textureComp), (this.textureComp = r);
  }
  setSize(e, t) {
    this.textureComp.setSize(e, t), this.textureOld.setSize(e, t);
  }
  dispose() {
    this.textureComp.dispose(),
      this.textureOld.dispose(),
      this.compFsMaterial.dispose(),
      this.copyFsMaterial.dispose(),
      this.compFsQuad.dispose(),
      this.copyFsQuad.dispose();
  }
}
const BadTVShader = {
    uniforms: {
      tDiffuse: { type: "t", value: null },
      time: { type: "f", value: 0 },
      distortion: { type: "f", value: 3 },
      distortion2: { type: "f", value: 5 },
      speed: { type: "f", value: 0.2 },
      rollSpeed: { type: "f", value: 0.1 },
    },
    vertexShader: [
      "varying vec2 vUv;",
      "void main() {",
      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
      "}",
    ].join("\n"),
    fragmentShader: [
      "uniform sampler2D tDiffuse;",
      "uniform float time;",
      "uniform float distortion;",
      "uniform float distortion2;",
      "uniform float speed;",
      "uniform float rollSpeed;",
      "varying vec2 vUv;",
      "vec3 mod289(vec3 x) {",
      "  return x - floor(x * (1.0 / 289.0)) * 289.0;",
      "}",
      "vec2 mod289(vec2 x) {",
      "  return x - floor(x * (1.0 / 289.0)) * 289.0;",
      "}",
      "vec3 permute(vec3 x) {",
      "  return mod289(((x*34.0)+1.0)*x);",
      "}",
      "float snoise(vec2 v)",
      "  {",
      "  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0",
      "                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)",
      "                     -0.577350269189626,  // -1.0 + 2.0 * C.x",
      "                      0.024390243902439); // 1.0 / 41.0",
      "  vec2 i  = floor(v + dot(v, C.yy) );",
      "  vec2 x0 = v -   i + dot(i, C.xx);",
      "  vec2 i1;",
      "  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);",
      "  vec4 x12 = x0.xyxy + C.xxzz;",
      " x12.xy -= i1;",
      "  i = mod289(i); // Avoid truncation effects in permutation",
      "  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))",
      "\t\t+ i.x + vec3(0.0, i1.x, 1.0 ));",
      "  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);",
      "  m = m*m ;",
      "  m = m*m ;",
      "  vec3 x = 2.0 * fract(p * C.www) - 1.0;",
      "  vec3 h = abs(x) - 0.5;",
      "  vec3 ox = floor(x + 0.5);",
      "  vec3 a0 = x - ox;",
      "  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );",
      "  vec3 g;",
      "  g.x  = a0.x  * x0.x  + h.x  * x0.y;",
      "  g.yz = a0.yz * x12.xz + h.yz * x12.yw;",
      "  return 130.0 * dot(m, g);",
      "}",
      "void main() {",
      "vec2 p = vUv;",
      "float ty = time*speed;",
      "float yt = p.y - ty;",
      "float offset = snoise(vec2(yt*3.0,0.0))*0.2;",
      "offset = offset*distortion * offset*distortion * offset;",
      "offset += snoise(vec2(yt*50.0,0.0))*distortion2*0.001;",
      "gl_FragColor = texture2D(tDiffuse,  vec2(fract(p.x + offset),fract(p.y-time*rollSpeed) ));",
      "}",
    ].join("\n"),
  },
  StaticShader = {
    uniforms: {
      tDiffuse: { type: "t", value: null },
      time: { type: "f", value: 0 },
      amount: { type: "f", value: 0.5 },
      size: { type: "f", value: 4 },
    },
    vertexShader: [
      "varying vec2 vUv;",
      "void main() {",
      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
      "}",
    ].join("\n"),
    fragmentShader: [
      "uniform sampler2D tDiffuse;",
      "uniform float time;",
      "uniform float amount;",
      "uniform float size;",
      "varying vec2 vUv;",
      "float rand(vec2 co){",
      "return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);",
      "}",
      "void main() {",
      "vec2 p = vUv;",
      "vec4 color = texture2D(tDiffuse, p);",
      "float xs = floor(gl_FragCoord.x / size);",
      "float ys = floor(gl_FragCoord.y / size);",
      "vec4 snow = vec4(rand(vec2(xs * time,ys * time))*amount);",
      "gl_FragColor = color+ snow;",
      "}",
    ].join("\n"),
  };

class CustomOutlinePass extends Pass {
  constructor(resolution, scene, camera) {
    super();

    this.renderScene = scene;
    this.renderCamera = camera;
    this.resolution = new THREE.Vector2(resolution.x, resolution.y);

    this.fsQuad = new FullScreenQuad(null);
    this.fsQuad.material = this.createOutlinePostProcessMaterial();

    // Create a buffer to store the normals of the scene onto
    const normalTarget = new THREE.WebGLRenderTarget(
      this.resolution.x,
      this.resolution.y
    );
    normalTarget.texture.format = THREE.RGBFormat;
    normalTarget.texture.minFilter = THREE.NearestFilter;
    normalTarget.texture.magFilter = THREE.NearestFilter;
    normalTarget.texture.generateMipmaps = false;
    normalTarget.stencilBuffer = false;
    this.normalTarget = normalTarget;

    this.normalOverrideMaterial = new THREE.MeshNormalMaterial();
  }

  dispose() {
    this.normalTarget.dispose();
    this.fsQuad.dispose();
  }

  setSize(width, height) {
    this.normalTarget.setSize(width, height);
    this.resolution.set(width, height);

    this.fsQuad.material.uniforms.screenSize.value.set(
      this.resolution.x,
      this.resolution.y,
      1 / this.resolution.x,
      1 / this.resolution.y
    );
  }

  render(renderer, writeBuffer, readBuffer) {
    // Turn off writing to the depth buffer
    // because we need to read from it in the subsequent passes.
    const depthBufferValue = writeBuffer.depthBuffer;
    writeBuffer.depthBuffer = false;

    // 1. Re-render the scene to capture all normals in texture.
    // Ideally we could capture this in the first render pass along with
    // the depth texture.
    renderer.setRenderTarget(this.normalTarget);

    const overrideMaterialValue = this.renderScene.overrideMaterial;
    this.renderScene.overrideMaterial = this.normalOverrideMaterial;
    renderer.render(this.renderScene, this.renderCamera);
    this.renderScene.overrideMaterial = overrideMaterialValue;

    this.fsQuad.material.uniforms["depthBuffer"].value =
      readBuffer.depthTexture;
    this.fsQuad.material.uniforms["normalBuffer"].value =
      this.normalTarget.texture;
    this.fsQuad.material.uniforms["sceneColorBuffer"].value =
      readBuffer.texture;

    // 2. Draw the outlines using the depth texture and normal texture
    // and combine it with the scene color
    if (this.renderToScreen) {
      // If this is the last effect, then renderToScreen is true.
      // So we should render to the screen by setting target null
      // Otherwise, just render into the writeBuffer that the next effect will use as its read buffer.
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      this.fsQuad.render(renderer);
    }

    // Reset the depthBuffer value so we continue writing to it in the next render.
    writeBuffer.depthBuffer = depthBufferValue;
  }

  get vertexShader() {
    return `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `;
  }
  get fragmentShader() {
    return `
        #include <packing>
        // The above include imports "perspectiveDepthToViewZ"
        // and other GLSL functions from ThreeJS we need for reading depth.
        uniform sampler2D sceneColorBuffer;
        uniform sampler2D depthBuffer;
        uniform sampler2D normalBuffer;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform vec4 screenSize;
        uniform vec3 outlineColor;
        uniform vec4 multiplierParameters;
        uniform int debugVisualize;
  
        varying vec2 vUv;
  
        // Helper functions for reading from depth buffer.
        float readDepth (sampler2D depthSampler, vec2 coord) {
          float fragCoordZ = texture2D(depthSampler, coord).x;
          float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
          return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
        }
        float getLinearDepth(vec3 pos) {
          return -(viewMatrix * vec4(pos, 1.0)).z;
        }
  
        float getLinearScreenDepth(sampler2D map) {
            vec2 uv = gl_FragCoord.xy * screenSize.zw;
            return readDepth(map,uv);
        }
        // Helper functions for reading normals and depth of neighboring pixels.
        float getPixelDepth(int x, int y) {
          // screenSize.zw is pixel size 
          // vUv is current position
          return readDepth(depthBuffer, vUv + screenSize.zw * vec2(x, y));
        }
        vec3 getPixelNormal(int x, int y) {
          return texture2D(normalBuffer, vUv + screenSize.zw * vec2(x, y)).rgb;
        }
  
        float saturate(float num) {
          return clamp(num, 0.0, 1.0);
        }
  
        void main() {
          vec4 sceneColor = texture2D(sceneColorBuffer, vUv);
          float depth = getPixelDepth(0, 0);
          vec3 normal = getPixelNormal(0, 0);
  
          // Get the difference between depth of neighboring pixels and current.
          float depthDiff = 0.0;
          depthDiff += abs(depth - getPixelDepth(1, 0));
          depthDiff += abs(depth - getPixelDepth(-1, 0));
          depthDiff += abs(depth - getPixelDepth(0, 1));
          depthDiff += abs(depth - getPixelDepth(0, -1));
  
          // Get the difference between normals of neighboring pixels and current
          float normalDiff = 0.0;
          normalDiff += distance(normal, getPixelNormal(1, 0));
          normalDiff += distance(normal, getPixelNormal(0, 1));
          normalDiff += distance(normal, getPixelNormal(0, 1));
          normalDiff += distance(normal, getPixelNormal(0, -1));
  
          normalDiff += distance(normal, getPixelNormal(1, 1));
          normalDiff += distance(normal, getPixelNormal(1, -1));
          normalDiff += distance(normal, getPixelNormal(-1, 1));
          normalDiff += distance(normal, getPixelNormal(-1, -1));
  
          // Apply multiplier & bias to each 
          float depthBias = multiplierParameters.x;
          float depthMultiplier = multiplierParameters.y;
          float normalBias = multiplierParameters.z;
          float normalMultiplier = multiplierParameters.w;
  
          depthDiff = depthDiff * depthMultiplier;
          depthDiff = saturate(depthDiff);
          depthDiff = pow(depthDiff, depthBias);
  
          normalDiff = normalDiff * normalMultiplier;
          normalDiff = saturate(normalDiff);
          normalDiff = pow(normalDiff, normalBias);
  
  
          float outline = normalDiff + depthDiff;
        
          // Combine outline with scene color.
          vec4 outlineColor = vec4(outlineColor, 1.0);
          gl_FragColor = vec4(mix(sceneColor, outlineColor, outline));
  
          // For debug visualization of the different inputs to this shader.
          if (debugVisualize == 1) {
            gl_FragColor = sceneColor;
          }
          if (debugVisualize == 2) {
            gl_FragColor = vec4(vec3(depth), 1.0);
          }
          if (debugVisualize == 3) {
            gl_FragColor = vec4(normal, 1.0);
          }
          if (debugVisualize == 4) {
            gl_FragColor = vec4(vec3(outline * outlineColor), 1.0);
          }
        }
        `;
  }

  createOutlinePostProcessMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        debugVisualize: { value: 0 },
        sceneColorBuffer: {},
        depthBuffer: {},
        normalBuffer: {},
        outlineColor: { value: new THREE.Color(0xffffff) },
        //4 scalar values packed in one uniform: depth multiplier, depth bias, and same for normals.
        multiplierParameters: { value: new THREE.Vector4(1, 1, 1, 1) },
        cameraNear: { value: this.renderCamera.near },
        cameraFar: { value: this.renderCamera.far },
        screenSize: {
          value: new THREE.Vector4(
            this.resolution.x,
            this.resolution.y,
            1 / this.resolution.x,
            1 / this.resolution.y
          ),
        },
      },
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
    });
  }
}

const FXAAShader = {
  name: "FXAAShader",

  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new Vector2(1 / 1024, 1 / 512) },
  },

  vertexShader: /* glsl */ `
  
      varying vec2 vUv;
  
      void main() {
  
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  
      }`,

  fragmentShader: /* glsl */ `
  
      // FXAA algorithm from NVIDIA, C# implementation by Jasper Flick, GLSL port by Dave Hoskins
      // http://developer.download.nvidia.com/assets/gamedev/files/sdk/11/FXAA_WhitePaper.pdf
      // https://catlikecoding.com/unity/tutorials/advanced-rendering/fxaa/
  
      uniform sampler2D tDiffuse;
      uniform vec2 resolution;
      varying vec2 vUv;
  
      #define EDGE_STEP_COUNT 6
      #define EDGE_GUESS 8.0
      #define EDGE_STEPS 1.0, 1.5, 2.0, 2.0, 2.0, 4.0
      const float edgeSteps[EDGE_STEP_COUNT] = float[EDGE_STEP_COUNT]( EDGE_STEPS );
  
      float _ContrastThreshold = 0.0312;
      float _RelativeThreshold = 0.063;
      float _SubpixelBlending = 1.0;
  
      vec4 Sample( sampler2D  tex2D, vec2 uv ) {
  
        return texture( tex2D, uv );
  
      }
  
      float SampleLuminance( sampler2D tex2D, vec2 uv ) {
  
        return dot( Sample( tex2D, uv ).rgb, vec3( 0.3, 0.59, 0.11 ) );
  
      }
  
      float SampleLuminance( sampler2D tex2D, vec2 texSize, vec2 uv, float uOffset, float vOffset ) {
  
        uv += texSize * vec2(uOffset, vOffset);
        return SampleLuminance(tex2D, uv);
  
      }
  
      struct LuminanceData {
  
        float m, n, e, s, w;
        float ne, nw, se, sw;
        float highest, lowest, contrast;
  
      };
  
      LuminanceData SampleLuminanceNeighborhood( sampler2D tex2D, vec2 texSize, vec2 uv ) {
  
        LuminanceData l;
        l.m = SampleLuminance( tex2D, uv );
        l.n = SampleLuminance( tex2D, texSize, uv,  0.0,  1.0 );
        l.e = SampleLuminance( tex2D, texSize, uv,  1.0,  0.0 );
        l.s = SampleLuminance( tex2D, texSize, uv,  0.0, -1.0 );
        l.w = SampleLuminance( tex2D, texSize, uv, -1.0,  0.0 );
  
        l.ne = SampleLuminance( tex2D, texSize, uv,  1.0,  1.0 );
        l.nw = SampleLuminance( tex2D, texSize, uv, -1.0,  1.0 );
        l.se = SampleLuminance( tex2D, texSize, uv,  1.0, -1.0 );
        l.sw = SampleLuminance( tex2D, texSize, uv, -1.0, -1.0 );
  
        l.highest = max( max( max( max( l.n, l.e ), l.s ), l.w ), l.m );
        l.lowest = min( min( min( min( l.n, l.e ), l.s ), l.w ), l.m );
        l.contrast = l.highest - l.lowest;
        return l;
  
      }
  
      bool ShouldSkipPixel( LuminanceData l ) {
  
        float threshold = max( _ContrastThreshold, _RelativeThreshold * l.highest );
        return l.contrast < threshold;
  
      }
  
      float DeterminePixelBlendFactor( LuminanceData l ) {
  
        float f = 2.0 * ( l.n + l.e + l.s + l.w );
        f += l.ne + l.nw + l.se + l.sw;
        f *= 1.0 / 12.0;
        f = abs( f - l.m );
        f = clamp( f / l.contrast, 0.0, 1.0 );
  
        float blendFactor = smoothstep( 0.0, 1.0, f );
        return blendFactor * blendFactor * _SubpixelBlending;
  
      }
  
      struct EdgeData {
  
        bool isHorizontal;
        float pixelStep;
        float oppositeLuminance, gradient;
  
      };
  
      EdgeData DetermineEdge( vec2 texSize, LuminanceData l ) {
  
        EdgeData e;
        float horizontal =
          abs( l.n + l.s - 2.0 * l.m ) * 2.0 +
          abs( l.ne + l.se - 2.0 * l.e ) +
          abs( l.nw + l.sw - 2.0 * l.w );
        float vertical =
          abs( l.e + l.w - 2.0 * l.m ) * 2.0 +
          abs( l.ne + l.nw - 2.0 * l.n ) +
          abs( l.se + l.sw - 2.0 * l.s );
        e.isHorizontal = horizontal >= vertical;
  
        float pLuminance = e.isHorizontal ? l.n : l.e;
        float nLuminance = e.isHorizontal ? l.s : l.w;
        float pGradient = abs( pLuminance - l.m );
        float nGradient = abs( nLuminance - l.m );
  
        e.pixelStep = e.isHorizontal ? texSize.y : texSize.x;
        
        if (pGradient < nGradient) {
  
          e.pixelStep = -e.pixelStep;
          e.oppositeLuminance = nLuminance;
          e.gradient = nGradient;
  
        } else {
  
          e.oppositeLuminance = pLuminance;
          e.gradient = pGradient;
  
        }
  
        return e;
  
      }
  
      float DetermineEdgeBlendFactor( sampler2D  tex2D, vec2 texSize, LuminanceData l, EdgeData e, vec2 uv ) {
  
        vec2 uvEdge = uv;
        vec2 edgeStep;
        if (e.isHorizontal) {
  
          uvEdge.y += e.pixelStep * 0.5;
          edgeStep = vec2( texSize.x, 0.0 );
  
        } else {
  
          uvEdge.x += e.pixelStep * 0.5;
          edgeStep = vec2( 0.0, texSize.y );
  
        }
  
        float edgeLuminance = ( l.m + e.oppositeLuminance ) * 0.5;
        float gradientThreshold = e.gradient * 0.25;
  
        vec2 puv = uvEdge + edgeStep * edgeSteps[0];
        float pLuminanceDelta = SampleLuminance( tex2D, puv ) - edgeLuminance;
        bool pAtEnd = abs( pLuminanceDelta ) >= gradientThreshold;
  
        for ( int i = 1; i < EDGE_STEP_COUNT && !pAtEnd; i++ ) {
  
          puv += edgeStep * edgeSteps[i];
          pLuminanceDelta = SampleLuminance( tex2D, puv ) - edgeLuminance;
          pAtEnd = abs( pLuminanceDelta ) >= gradientThreshold;
  
        }
  
        if ( !pAtEnd ) {
  
          puv += edgeStep * EDGE_GUESS;
  
        }
  
        vec2 nuv = uvEdge - edgeStep * edgeSteps[0];
        float nLuminanceDelta = SampleLuminance( tex2D, nuv ) - edgeLuminance;
        bool nAtEnd = abs( nLuminanceDelta ) >= gradientThreshold;
  
        for ( int i = 1; i < EDGE_STEP_COUNT && !nAtEnd; i++ ) {
  
          nuv -= edgeStep * edgeSteps[i];
          nLuminanceDelta = SampleLuminance( tex2D, nuv ) - edgeLuminance;
          nAtEnd = abs( nLuminanceDelta ) >= gradientThreshold;
  
        }
  
        if ( !nAtEnd ) {
  
          nuv -= edgeStep * EDGE_GUESS;
  
        }
  
        float pDistance, nDistance;
        if ( e.isHorizontal ) {
  
          pDistance = puv.x - uv.x;
          nDistance = uv.x - nuv.x;
  
        } else {
          
          pDistance = puv.y - uv.y;
          nDistance = uv.y - nuv.y;
  
        }
  
        float shortestDistance;
        bool deltaSign;
        if ( pDistance <= nDistance ) {
  
          shortestDistance = pDistance;
          deltaSign = pLuminanceDelta >= 0.0;
  
        } else {
  
          shortestDistance = nDistance;
          deltaSign = nLuminanceDelta >= 0.0;
  
        }
  
        if ( deltaSign == ( l.m - edgeLuminance >= 0.0 ) ) {
  
          return 0.0;
  
        }
  
        return 0.5 - shortestDistance / ( pDistance + nDistance );
  
      }
  
      vec4 ApplyFXAA( sampler2D  tex2D, vec2 texSize, vec2 uv ) {
  
        LuminanceData luminance = SampleLuminanceNeighborhood( tex2D, texSize, uv );
        if ( ShouldSkipPixel( luminance ) ) {
  
          return Sample( tex2D, uv );
  
        }
  
        float pixelBlend = DeterminePixelBlendFactor( luminance );
        EdgeData edge = DetermineEdge( texSize, luminance );
        float edgeBlend = DetermineEdgeBlendFactor( tex2D, texSize, luminance, edge, uv );
        float finalBlend = max( pixelBlend, edgeBlend );
  
        if (edge.isHorizontal) {
  
          uv.y += edge.pixelStep * finalBlend;
  
        } else {
  
          uv.x += edge.pixelStep * finalBlend;
  
        }
  
        return Sample( tex2D, uv );
  
      }
  
      void main() {
  
        gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );
        
      }`,
};
////////////////////////
// Moebius Effect ///// https://github.com/txstc55/moebius-effect-threejs
//////////////////////
class PencilLinesPass2 extends Pass {
  constructor(width, height, scene, camera) {
    super();
    this.scene = scene;
    this.camera = camera;

    this.material = new MoebiusMaterial();
    this.randomNumbers = new Array(32);
    for (var i = 0; i < 32; i++) {
      this.randomNumbers[i] = Math.random() * 90 + 7.0;
    }
    this.material.uniforms.timerRandoms.value = this.randomNumbers;
    this.lastTime = Date.now();

    this.fsQuad = new FullScreenQuad(this.material);
    this.material.uniforms.uResolution.value = new THREE.Vector2(width, height);

    // for normal buffer
    const normalBuffer = new THREE.WebGLRenderTarget(width, height);

    normalBuffer.texture.format = THREE.RGBAFormat;
    normalBuffer.texture.type = THREE.HalfFloatType;
    normalBuffer.texture.minFilter = THREE.NearestFilter;
    normalBuffer.texture.magFilter = THREE.NearestFilter;
    normalBuffer.texture.generateMipmaps = false;
    normalBuffer.stencilBuffer = false;
    this.normalBuffer = normalBuffer;

    this.normalMaterial = new THREE.ShaderMaterial({
      uniforms: {
        lightPos: { value: new THREE.Vector3(0, 4.0, 0.0) },
        cameraPos: { value: new THREE.Vector3(0, 0, 0) },
      },
      vertexShader: `
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
      
          void main() {
              vNormal = normalize(mat3(modelMatrix) * normal);
              vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
              gl_Position = projectionMatrix * (modelViewMatrix * vec4(position, 1.0));
          }
          
          `,
      fragmentShader: `
          uniform vec3 cameraPos;
          uniform vec3 lightPos; // in world space
      
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
      
          void main() {
              // Calculate view direction in world space
              vec3 viewDir = normalize(cameraPos - vWorldPosition);
      
              // Specular term
              vec3 lightDir = normalize(lightPos - vWorldPosition);
              vec3 reflectDir = reflect(-lightDir, vNormal);
              float spec = pow(max(dot(viewDir, reflectDir), 0.0), length(lightPos - vWorldPosition) * 4.0);
              // gl_FragColor = vec4(spec, spec, spec, 1.0);

              // diffuse term
              float diff = max(dot(vNormal, lightDir), 0.0);
              if (spec > 0.59){
                  gl_FragColor = vec4(100000.0, 100000.0, 100000.0, 1.0);
              }else if (diff > 0.95){
                  gl_FragColor = vec4(2000.0, 2000.0, 2000.0, 1.0);
              }else{
                  gl_FragColor = vec4(vNormal, 1.0);
              }
              // gl_FragColor = vec4(viewDir, 1.0);
          }
          `,
    });
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }

  render(renderer, writeBuffer, readBuffer) {
    renderer.setRenderTarget(this.normalBuffer);
    const overrideMaterialBefore = this.scene.overrideMaterial;

    this.normalMaterial.uniforms.cameraPos.value = this.camera.position;
    this.scene.overrideMaterial = this.normalMaterial;

    renderer.render(this.scene, this.camera);
    this.scene.overrideMaterial = overrideMaterialBefore;
    this.material.uniforms.uNormals.value = this.normalBuffer.texture;
    this.material.uniforms.tDiffuse.value = readBuffer.texture;

    // check passed time
    var currentTime = Date.now();
    if (currentTime - this.lastTime > 1000) {
      for (var i = 0; i < 32; i++) {
        this.randomNumbers[i] = Math.random() * 40.0 + 7.0;
      }
      this.material.uniforms.timerRandoms.value = this.randomNumbers;
      this.lastTime = Date.now();
    }

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
      this.fsQuad.render(renderer);
    }
  }
  changeLight(lightPos) {
    this.normalMaterial.uniforms.lightPos.value = lightPos;
  }

  // resize the canvas
  resize(width, height) {
    this.material.uniforms.uResolution.value = new THREE.Vector2(width, height);
  }
}

class MoebiusMaterial extends THREE.ShaderMaterial {
  constructor() {
    const vertexShader = `
    varying vec2 vUv;
    uniform vec2 uResolution;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
`;

    const fragmentShader = `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform sampler2D uNormals;
    uniform float timerRandoms[32];

    varying vec2 vUv;

    float rand(vec2 co){
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float randDispl(float xCoord, float yCoord, float resolutionX, float resolutionY, float factor, vec4 randVariables){
        float randNum = rand(vec2(xCoord, yCoord));
        float disp = ((1.0 + randNum) * (sin(yCoord*resolutionY / randVariables.x)) * factor + (1.0 + randNum) * (sin(yCoord*resolutionY / randVariables.y)) * factor  + (1.0 + randNum) * (sin(yCoord*resolutionY / randVariables.z)) * factor  + (1.0 + randNum) * (sin(yCoord*resolutionY / randVariables.w)) * factor) / 4.0;
        return disp;
    }

    float valueAtPoint(sampler2D image, vec2 coord, vec2 texel, vec2 point) {
        vec3 luma = vec3(0.299, 0.587, 0.114);
        // here we have a rand so we have the pencil line effect
        // 2.0*rand(coord)*
        return dot(texture2D(image, coord + texel * point).xyz, luma);
    }

    float diffuseValue(float x, float y) {
        return valueAtPoint(tDiffuse, vUv, vec2(1.0 / uResolution.x, 1.0 / uResolution.y), vec2(x, y)) * 0.6;
    }
    float normalValue(float x, float y) {
        return valueAtPoint(uNormals, vUv, vec2(1.0 / uResolution.x, 1.0 / uResolution.y), vec2(x, y)) * 0.4;
    }

    float getValue(float x, float y) {
        return diffuseValue(x, y) + normalValue(x, y);
    }

    float combinedSobelValue() {
        // kernel definition (in glsl matrices are filled in column-major order)
        const mat3 Gx = mat3(-1, -2, -1, 0, 0, 0, 1, 2, 1);// x direction kernel
        const mat3 Gy = mat3(-1, 0, 1, -2, 0, 2, -1, 0, 1);// y direction kernel

        // fetch the 3x3 neighbourhood of a fragment

        // first column
        float xDisp = randDispl(vUv.x, vUv.y, uResolution.x, uResolution.y, 1.5, vec4(22.0, 13.0, 37.0, 89.0));
        float yDisp = randDispl(vUv.y, vUv.x, uResolution.y, uResolution.x, 1.5, vec4(22.0, 13.0, 37.0, 89.0));

        float tx0y0 = getValue(-1.0+ xDisp, -1.0 + yDisp);
        float tx0y1 = getValue(-1.0+ xDisp, 0.0 + yDisp);
        float tx0y2 = getValue(-1.0+ xDisp, 1.0 + yDisp);

        // second column
        float tx1y0 = getValue(0.0+ xDisp, -1.0 + yDisp);
        float tx1y1 = getValue(0.0+ xDisp, 0.0 + yDisp);
        float tx1y2 = getValue(0.0+ xDisp, 1.0 + yDisp);

        // third column
        float tx2y0 = getValue(1.0+ xDisp, -1.0 + yDisp);
        float tx2y1 = getValue(1.0+ xDisp, 0.0 + yDisp);
        float tx2y2 = getValue(1.0+ xDisp, 1.0 + yDisp);

        // gradient value in x direction
        float valueGx = Gx[0][0] * tx0y0 + Gx[1][0] * tx1y0 + Gx[2][0] * tx2y0 +
        Gx[0][1] * tx0y1 + Gx[1][1] * tx1y1 + Gx[2][1] * tx2y1 +
        Gx[0][2] * tx0y2 + Gx[1][2] * tx1y2 + Gx[2][2] * tx2y2;

        // gradient value in y direction
        float valueGy = Gy[0][0] * tx0y0 + Gy[1][0] * tx1y0 + Gy[2][0] * tx2y0 +
        Gy[0][1] * tx0y1 + Gy[1][1] * tx1y1 + Gy[2][1] * tx2y1 +
        Gy[0][2] * tx0y2 + Gy[1][2] * tx1y2 + Gy[2][2] * tx2y2;

        // magnitude of the total gradient
        float G = (valueGx * valueGx) + (valueGy * valueGy);
        return clamp(G, 0.0, 1.0);
    }

    float luma(vec4 color){
        return 0.2126*color.x + 0.7152*color.y + 0.0722*color.z;
    }
    vec3 czm_saturation(vec3 rgb, float adjustment)
    {
        // Algorithm from Chapter 16 of OpenGL Shading Language
        const vec3 W = vec3(0.2125, 0.7154, 0.0721);
        vec3 intensity = vec3(dot(rgb, W));
        return mix(intensity, rgb, adjustment);
    }



    void main() {
        float sobelValue = combinedSobelValue();
        sobelValue = smoothstep(0.01, 0.03, sobelValue);

        vec4 lineColor = vec4(0.0, 0.0, 0.0, 1.0);

        if (sobelValue > 0.1) {
            gl_FragColor = lineColor;
        } else {
            vec4 normalColor = texture2D(uNormals, vUv);

            // now we make the texture
            if (normalColor.x > 2000.0 && normalColor.y > 2000.0 && normalColor.z > 2000.0){
                gl_FragColor = vec4(240.0/255.0, 234.0/255.0, 214.0/255.0, 1.0);
            }else if (normalColor.x > 100.0 && normalColor.y > 100.0 && normalColor.z > 100.0){
                gl_FragColor = vec4(czm_saturation((texture2D(tDiffuse, vUv) * 0.5 + vec4(240.0/255.0, 234.0/255.0, 214.0/255.0, 1.0) * 0.5).xyz, 0.4), 1.0);
            }else{
                // we will also need to distort the texture a bit


                float xDisps[5] = float[](randDispl(vUv.x, vUv.y, uResolution.x, uResolution.y, 1.5 / uResolution.x, vec4(22.0, 13.0, 37.0, 89.0)), randDispl(vUv.x, vUv.y, uResolution.x, uResolution.y, 1.5 / uResolution.x, vec4(timerRandoms[0], timerRandoms[1], timerRandoms[2], timerRandoms[3])), randDispl(vUv.x, vUv.y, uResolution.x, uResolution.y, 1.5 / uResolution.x, vec4(timerRandoms[4], timerRandoms[5], timerRandoms[6], timerRandoms[7])), randDispl(vUv.x, vUv.y, uResolution.x, uResolution.y, 1.5 / uResolution.x, vec4(timerRandoms[8], timerRandoms[9], timerRandoms[10], timerRandoms[11])), randDispl(vUv.x, vUv.y, uResolution.x, uResolution.y, 1.5 / uResolution.x, vec4(timerRandoms[12], timerRandoms[13], timerRandoms[14], timerRandoms[15])));

                float yDisps[5] = float[](randDispl(vUv.y, vUv.x, uResolution.y, uResolution.x, 1.5 / uResolution.y, vec4(22.0, 13.0, 37.0, 89.0)), randDispl(vUv.y, vUv.x, uResolution.y, uResolution.x, 1.5 / uResolution.y, vec4(timerRandoms[16], timerRandoms[17], timerRandoms[18], timerRandoms[19])), randDispl(vUv.y, vUv.x, uResolution.y, uResolution.x, 1.5 / uResolution.y, vec4(timerRandoms[20], timerRandoms[21], timerRandoms[22], timerRandoms[23])), randDispl(vUv.y, vUv.x, uResolution.y, uResolution.x, 1.5 / uResolution.y, vec4(timerRandoms[24], timerRandoms[25], timerRandoms[26], timerRandoms[7])), randDispl(vUv.y, vUv.x, uResolution.y, uResolution.x, 1.5 / uResolution.y, vec4(timerRandoms[28], timerRandoms[29], timerRandoms[30], timerRandoms[31])));


                vec2 vUvNew = vUv + vec2(xDisps[0], yDisps[0]);
                gl_FragColor =  vec4(czm_saturation(texture2D(tDiffuse, vUvNew).xyz, 0.3), 1.0);

                vec4 pixelColor = texture2D(tDiffuse, vUvNew);
                float pixelLuma = luma(pixelColor);
                if (pixelLuma <= 0.32){
                    float stripe = mod((vUv.y * uResolution.y + vUv.x * uResolution.x) / 17.7, 4.0);
                    if (stripe <= 1.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[1], yDisps[1]);
                        if (mod(vUvStripe.x * uResolution.x, 17.7) <=1.5){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }else if (stripe <= 2.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[2], yDisps[2]);
                        if (mod(vUvStripe.x * uResolution.x, 17.7) <=1.5){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }
                    else if (stripe <= 3.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[2], yDisps[2]);
                        if (mod(vUvStripe.x * uResolution.x, 17.7) <=1.5){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }
                    else if (stripe <= 4.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[3], yDisps[3]);
                        if (mod(vUvStripe.x * uResolution.x, 17.7) <=1.5){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }
                }
                if (pixelLuma <= 0.48){
                    float stripe = mod((vUv.y * uResolution.y + vUv.x * uResolution.x) / 17.7, 4.0);
                    if (stripe <= 1.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[1], yDisps[1]);
                        if (mod(vUvStripe.y * uResolution.y, 17.7) <=1.5){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }else if (stripe <= 2.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[2], yDisps[2]);
                        if (mod(vUvStripe.y * uResolution.y, 17.7) <=1.5){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }
                    else if (stripe <= 3.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[2], yDisps[2]);
                        if (mod(vUvStripe.y * uResolution.y, 17.7) <=1.5){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }
                    else if (stripe <= 4.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[3], yDisps[3]);
                        if (mod(vUvStripe.y * uResolution.y, 17.7) <=1.5){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }
                }
                if (pixelLuma <= 0.64){
                    float stripe = mod((-vUv.y * uResolution.y + vUv.x * uResolution.x) / (17.7 + 5.0 * sin(-vUv.y * uResolution.y + vUv.x * uResolution.x)), 4.0);
                    if (stripe <= 1.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[1], yDisps[1]);
                        if (mod(-vUvStripe.y * uResolution.y + vUvStripe.x * uResolution.x, 17.7) <=1.5){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }else if (stripe <= 2.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[2], yDisps[2]);
                        if (mod(-vUvStripe.y * uResolution.y + vUvStripe.x * uResolution.x, 17.7) <=1.5){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }
                    else if (stripe <= 3.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[2], yDisps[2]);
                        if (mod(-vUvStripe.y * uResolution.y + vUvStripe.x * uResolution.x, 17.7) <=1.5){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }
                    else if (stripe <= 4.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[3], yDisps[3]);
                        if (mod(-vUvStripe.y * uResolution.y + vUvStripe.x * uResolution.x, 17.7) <=1.5){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }
                }
                if (pixelLuma <= 0.75){
                    float stripe = mod((vUv.y * uResolution.y + vUv.x * uResolution.x) / (17.7 + 5.0 * sin(vUv.y * uResolution.y + vUv.x * uResolution.x)), 4.0);
                    if (stripe <= 1.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[1], yDisps[1]);
                        if (mod(vUvStripe.y * uResolution.y + vUvStripe.x * uResolution.x, 17.7) <=1.5){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }else if (stripe <= 2.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[2], yDisps[2]);
                        if (mod(vUvStripe.y * uResolution.y + vUvStripe.x * uResolution.x, 17.7) <=1.5){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }
                    else if (stripe <= 3.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[2], yDisps[2]);
                        if (mod(vUvStripe.y * uResolution.y + vUvStripe.x * uResolution.x, 17.7) <=1.5){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }
                    else if (stripe <= 4.0){
                        vec2 vUvStripe = vUv + vec2(xDisps[3], yDisps[3]);
                        if (mod(vUvStripe.y * uResolution.y + vUvStripe.x * uResolution.x, 17.7) <=1.){
                            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        }
                    }
                }
                if (pixelLuma > 0.75){
                    gl_FragColor = vec4(czm_saturation((texture2D(tDiffuse, vUv) * 0.7 + vec4(240.0/255.0, 234.0/255.0, 214.0/255.0, 1.0) * 0.3).xyz, 0.4), 1.0);
                }
            }
        }
    }
`;
    super({
      uniforms: {
        tDiffuse: { value: null },
        uNormals: { value: null },
        timerRandoms: { value: [] },
        uResolution: {
          value: new THREE.Vector2(1, 1),
        },
      },
      fragmentShader,
      vertexShader,
    });
  }
}

function getParams(str) {
  const params = {};
  const cleanedStr = str.replace(/\s/g, ""); // Remove all whitespace
  const properties = cleanedStr.split(","); // Split by commas

  for (let i = 0; i < properties.length; i++) {
    const [key, value] = properties[i].split(":"); // Split each property into key and value
    params[key] = eval(value); // Evaluate the value (e.g., convert "1" to 1, "Math.PI" to 3.14159, etc.)
  }

  return params;
}

AFRAME.registerComponent("post-processing", {
  schema: {
    effect: { type: "string", default: "none" },
    sketchyPencilParams: { type: "string", default: "none" },
    halftoneParams: {
      type: "string",
      default:
        "shape: 1, radius: 6, rotateR: Math.PI / 12, rotateB: (Math.PI / 12) * 2, rotateG: (Math.PI / 12) * 3, scatter: 1, blending: 1, blendingMode: 1, greyscale: false, disable: false",
    },
    oldFilmParams: {
      type: "string",
      default: "grayscale: true, nIntensity: 0.3, sIntensity: 0.3, sCount: 256",
    },
    pixelParams: {
      type: "string",
      default:
        "pixelSize: 12, normalEdgeStrength: 0.35, depthEdgeStrength: 0.4",
    },
    glitchParams: { type: "string", default: "goWild: false, enabled: true" },
    sobelParams: { type: "string", default: "enabled: true" },
    bloomParams: {
      type: "string",
      default: "threshold: 0.1, strength: 0.4, radius: 0.1, exposure: 1",
    },
    dotScreenParams: { type: "string", default: "scale: 4, angle: 90" },
    volumetricLightParams: {
      type: "string",
      default: "decay: 0.95, density: 0.5, exposure: 0.2, samples: 50",
    },
    afterimageParams: { type: "string", default: "damp: 0.8" },
    badTVParams: {
      type: "string",
      default:
        "mute: true, show: true, distortion: 1.0, distortion2: 1.0, speed: 0.2, rollSpeed: 0",
    },
    customOutlineParams: {
      type: "string",
      default:
        "outlineColor: 0xffffff, depthBias: 16, depthMult: 83, normalBias: 5, normalMult: 1.0",
    },
    moebiusParams: {
      type: "string",
      default: "none",
    },
  },

  init: function () {
    this.renderer = this.el.sceneEl.renderer;
    this.camera = this.el.camera;
    this.scene = this.el.object3D;

    if (!this.renderer) {
      console.error(
        "Renderer is not available. Ensure the scene is properly initialized."
      );
      return;
    }

    this.originalRender = this.renderer.render;
    this.setupEffect();

    // Listen for changes in the effect select dropdown
    const effectSelect = document.getElementById("effect-select");
    effectSelect.addEventListener("change", (event) => {
      this.el.setAttribute("post-processing", "effect", event.target.value);
      this.updateEffectParamsUI(event.target.value);
    });
  },

  update: function () {
    this.setupEffect();
  },

  updateEffectParamsUI: function (effect) {
    const paramsContainer = document.getElementById("effect-params");
    paramsContainer.innerHTML = ""; // Clear previous parameters

    if (effect === "none") return;

    const params = this.getEffectParams(effect);
    if (Object.keys(params).length === 0) {
      paramsContainer.innerHTML =
        "<p>No parameters available for this effect.</p>";
      return;
    }

    for (const [key, value] of Object.entries(params)) {
      // Create a container for each parameter
      const paramContainer = document.createElement("div");
      paramContainer.style.marginBottom = "10px";

      // Create a label for the parameter
      const label = document.createElement("label");
      label.htmlFor = `param-${key}`;
      label.textContent = key;
      paramContainer.appendChild(label);

      // Handle color picker for outlineColor
      if (key === "outlineColor" && effect === "custom-outline") {
        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.id = `param-${key}`;
        colorInput.value = `#${value.toString(16).padStart(6, "0")}`; // Convert color to hex format
        paramContainer.appendChild(colorInput);

        // Update the value display and effect parameter when the color changes
        colorInput.addEventListener("input", (event) => {
          const newValue = parseInt(event.target.value.replace("#", ""), 16); // Convert hex to number
          this.updateEffectParam(effect, key, newValue);
        });
      } else {
        // Create a range input for other parameters
        const input = document.createElement("input");
        input.type = "range";
        input.id = `param-${key}`;

        // Determine if the parameter is a whole number or a float
        const isWholeNumber = Number.isInteger(value);

        // Set min, max, and step based on the parameter type
        if (isWholeNumber) {
          input.min = 0; // Minimum value for whole numbers
          input.max = value * 5; // Set max to double the default value (or any other reasonable limit)
          input.step = 1; // Step size for whole numbers
        } else {
          input.min = 0; // Minimum value for floats
          input.max = 1; // Maximum value for floats (adjust as needed)
          input.step = 0.01; // Step size for fine-tuning floats
        }

        input.value = value;

        // Create a span to display the current value
        const valueDisplay = document.createElement("span");
        valueDisplay.textContent = `: ${value}`;
        paramContainer.appendChild(valueDisplay);

        // Update the value display and effect parameter when the slider changes
        input.addEventListener("input", (event) => {
          const newValue = parseFloat(event.target.value);
          valueDisplay.textContent = `: ${
            isWholeNumber ? newValue : newValue.toFixed(2)
          }`; // Display value with 2 decimal places for floats
          this.updateEffectParam(effect, key, newValue);
        });

        paramContainer.appendChild(input);
      }

      paramsContainer.appendChild(paramContainer);
    }
  },

  getEffectParams: function (effect) {
    const effectToSchemaMap = {
      "sketchy-pencil": "sketchyPencilParams", // Ensure this mapping is correct
      halftone: "halftoneParams",
      "old-film": "oldFilmParams",
      pixel: "pixelParams",
      glitch: "glitchParams",
      sobel: "sobelParams",
      bloom: "bloomParams",
      "dot-screen": "dotScreenParams",
      "volumetric-light": "volumetricLightParams",
      afterimage: "afterimageParams",
      "bad-tv": "badTVParams",
      "custom-outline": "customOutlineParams",
      moebius: "moebiusParams",
    };

    const schemaProperty = effectToSchemaMap[effect];
    if (!schemaProperty) {
      console.error(`No parameters found for effect: ${effect}`);
      return {};
    }

    const paramsString = this.data[schemaProperty];
    if (!paramsString) {
      console.error(`Parameters string is undefined for effect: ${effect}`);
      return {};
    }

    return this.parseParams(paramsString);
  },

  parseParams: function (paramsString) {
    const params = {};
    if (!paramsString || typeof paramsString !== "string") {
      return params;
    }

    // Split the string by commas and trim whitespace
    paramsString.split(",").forEach((param) => {
      const [key, value] = param.split(":").map((s) => s.trim());
      if (key && value && !isNaN(value)) {
        params[key] = parseFloat(value);
      }
    });

    return params;
  },

  updateEffectParam: function (effect, param, value) {
    const effectToSchemaMap = {
      "sketchy-pencil": "sketchyPencilParams",
      halftone: "halftoneParams",
      "old-film": "oldFilmParams",
      pixel: "pixelParams",
      glitch: "glitchParams",
      sobel: "sobelParams",
      bloom: "bloomParams",
      "dot-screen": "dotScreenParams",
      "volumetric-light": "volumetricLightParams",
      afterimage: "afterimageParams",
      "bad-tv": "badTVParams",
      "custom-outline": "customOutlineParams",
      moebius: "moebiusParams",
    };

    const schemaProperty = effectToSchemaMap[effect];
    if (!schemaProperty) {
      console.error(`No schema property found for effect: ${effect}`);
      return;
    }

    // Get the current parameters for the effect
    const params = this.getEffectParams(effect);
    params[param] = value;

    // Update the schema property with the new parameters
    this.data[schemaProperty] = Object.entries(params)
      .map(([key, val]) => `${key}: ${val}`)
      .join(", ");

    // Re-apply the effect with the updated parameters
    this.setupEffect();
  },

  setupEffect: function () {
    // Clear existing composer if it exists
    if (this.composer) {
      this.composer.passes = [];
      this.composer = null;
    }

    if (this.occlusionComposer) {
      this.occlusionComposer.passes = [];
      this.occlusionComposer = null;
    }

    // Restore the original render function if the effect is "none"
    if (this.data.effect === "none") {
      this.renderer.render = this.originalRender;
      return;
    }

    // Initialize EffectComposer with the renderer
    this.composer = new EffectComposer(this.renderer);

    // Add a render pass for the scene and camera
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Add the selected effect pass
    if (this.data.effect === "sketchy-pencil") {
      const pencilLinesPass = new PencilLinesPass({
        width: this.renderer.domElement.clientWidth,
        height: this.renderer.domElement.clientHeight,
        scene: this.scene,
        camera: this.camera,
      });
      pencilLinesPass.renderToScreen = false;
      this.composer.addPass(pencilLinesPass);
    } else if (this.data.effect === "halftone") {
      const halftoneParams = getParams(this.data.halftoneParams);
      const halftonePass = new HalftonePass(
        window.innerWidth,
        window.innerHeight,
        halftoneParams
      );
      this.composer.addPass(halftonePass);
    } else if (this.data.effect === "old-film") {
      const oldFilmParams = getParams(this.data.oldFilmParams);
      const filmPass = new FilmPass();
      filmPass.material.uniforms.grayscale.value = oldFilmParams.grayscale;
      filmPass.material.uniforms.nIntensity.value = oldFilmParams.nIntensity;
      filmPass.material.uniforms.sIntensity.value = oldFilmParams.sIntensity;
      filmPass.material.uniforms.sCount.value = oldFilmParams.sCount;
      this.composer.addPass(filmPass);
      const vignettePass = new ShaderPass(VignetteShader);
      vignettePass.uniforms.offset.value = 1.5;
      vignettePass.uniforms.darkness.value = 0.9;
      vignettePass.renderToScreen = true;
      this.composer.addPass(vignettePass);
    } else if (this.data.effect === "pixel") {
      const pixelParams = getParams(this.data.pixelParams);
      const pixelPass = new RenderPixelatedPass(
        pixelParams.pixelSize,
        this.scene,
        this.camera,
        pixelParams
      );
      this.composer.addPass(pixelPass);
      const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
      this.composer.addPass(gammaCorrectionPass);
    } else if (this.data.effect === "glitch") {
      const glitchParams = getParams(this.data.glitchParams);
      const glitchPass = new GlitchPass();
      glitchPass.goWild = glitchParams.goWild;
      glitchPass.enabled = glitchParams.enabled;
      this.composer.addPass(glitchPass);
      const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
      this.composer.addPass(gammaCorrectionPass);
    } else if (this.data.effect === "sobel") {
      const sobelParams = getParams(this.data.sobelParams);
      const sobelPass = new ShaderPass(SobelOperatorShader);
      sobelPass.enabled = sobelParams.enabled;
      sobelPass.uniforms.resolution.value.x =
        window.innerWidth * window.devicePixelRatio;
      sobelPass.uniforms.resolution.value.y =
        window.innerHeight * window.devicePixelRatio;
      this.composer.addPass(sobelPass);
    } else if (this.data.effect === "bloom") {
      const bloomParams = getParams(this.data.bloomParams);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(
          this.renderer.domElement.clientWidth,
          this.renderer.domElement.clientHeight
        ),
        1.5,
        0.4,
        0.85
      );
      bloomPass.threshold = bloomParams.threshold;
      bloomPass.strength = bloomParams.strength;
      bloomPass.radius = bloomParams.radius;
      this.composer.addPass(bloomPass);
      const outputPass = new OutputPass(THREE.ReinhardToneMapping);
      outputPass.toneMappingExposure = bloomParams.exposure;
      this.composer.addPass(outputPass);
    } else if (this.data.effect === "dot-screen") {
      const dotScreenParams = getParams(this.data.dotScreenParams);
      const dotScreenPass = new ShaderPass(DotScreenShader);
      dotScreenPass.uniforms.scale.value = dotScreenParams.scale;
      dotScreenPass.uniforms.angle.value = dotScreenParams.angle;
      this.composer.addPass(dotScreenPass);
      const rgbShiftPass = new ShaderPass(RGBShiftShader);
      rgbShiftPass.uniforms.amount.value = 0.0015;
      this.composer.addPass(rgbShiftPass);
      const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
      this.composer.addPass(gammaCorrectionPass);
    } else if (this.data.effect === "volumetric-light") {
      this.DEFAULT_LAYER = 0;
      this.OCCLUSION_LAYER = 1;
      const renderTarget = new THREE.WebGLRenderTarget(
        0.5 * this.renderer.domElement.clientWidth,
        0.5 * this.renderer.domElement.clientHeight
      );
      this.occlusionComposer = new EffectComposer(this.renderer, renderTarget);
      this.occlusionComposer.addPass(new RenderPass(this.scene, this.camera));
      const volumetricLightParams = getParams(this.data.volumetricLightParams);
      const volumetricLightPass = new ShaderPass(VolumetericLightShader);
      volumetricLightPass.uniforms.decay.value = volumetricLightParams.decay;
      volumetricLightPass.uniforms.density.value =
        volumetricLightParams.density;
      volumetricLightPass.uniforms.exposure.value =
        volumetricLightParams.exposure;
      volumetricLightPass.uniforms.samples.value =
        volumetricLightParams.samples;
      this.occlusionComposer.addPass(volumetricLightPass);
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      const additiveBlendingPass = new ShaderPass(AdditiveBlendingShader);
      additiveBlendingPass.uniforms.tAdd.value = renderTarget.texture;
      this.composer.addPass(additiveBlendingPass);
      additiveBlendingPass.renderToScreen = true;
      this.camera.layers.set(this.OCCLUSION_LAYER);
      this.renderer.setClearColor(0);
      this.occlusionComposer.render();
      this.camera.layers.set(this.DEFAULT_LAYER);
      this.renderer.setClearColor(591377);
    } else if (this.data.effect === "afterimage") {
      const afterimageParams = getParams(this.data.afterimageParams);
      const afterimagePass = new AfterimagePass();
      afterimagePass.uniforms.damp.value = afterimageParams.damp;
      this.composer.addPass(afterimagePass);
      const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
      this.composer.addPass(gammaCorrectionPass);
    } else if (this.data.effect === "bad-tv") {
      const badTVParams = getParams(this.data.badTVParams);
      const badTVPass = new ShaderPass(BadTVShader);
      const rgbShiftPass = new ShaderPass(RGBShiftShader);
      const filmPass = new ShaderPass(FilmShader);
      const staticPass = new ShaderPass(StaticShader);
      const copyPass = new ShaderPass(CopyShader);
      filmPass.uniforms.grayscale.value = 0;
      const staticParams = { show: true, amount: 0.5, size: 4 };
      const rgbShiftParams = { show: true, amount: 0.005, angle: 0 };
      const filmParams = {
        show: true,
        count: 800,
        sIntensity: 0.9,
        nIntensity: 0.4,
      };
      let time = 0;
      const animate = () => {
        time += 0.1;
        badTVPass.uniforms.time.value = time;
        filmPass.uniforms.time.value = time;
        staticPass.uniforms.time.value = time;
        requestAnimationFrame(animate);
      };
      badTVPass.uniforms.distortion.value = badTVParams.distortion;
      badTVPass.uniforms.distortion2.value = badTVParams.distortion2;
      badTVPass.uniforms.speed.value = badTVParams.speed;
      badTVPass.uniforms.rollSpeed.value = badTVParams.rollSpeed;
      staticPass.uniforms.amount.value = staticParams.amount;
      staticPass.uniforms.size.value = staticParams.size;
      rgbShiftPass.uniforms.angle.value = rgbShiftParams.angle * Math.PI;
      rgbShiftPass.uniforms.amount.value = rgbShiftParams.amount;
      filmPass.uniforms.sCount.value = filmParams.count;
      filmPass.uniforms.sIntensity.value = filmParams.sIntensity;
      filmPass.uniforms.nIntensity.value = filmParams.nIntensity;
      this.composer.addPass(badTVPass);
      this.composer.addPass(rgbShiftPass);
      this.composer.addPass(filmPass);
      this.composer.addPass(staticPass);
      this.composer.addPass(copyPass);
      animate();
    } else if (this.data.effect === "custom-outline") {
      const customOutline = new CustomOutlinePass(
        new THREE.Vector2(
          this.renderer.domElement.clientWidth,
          this.renderer.domElement.clientHeight
        ),
        this.scene,
        this.camera
      );
      this.composer.addPass(customOutline);
      const effectFXAA = new ShaderPass(FXAAShader);
      effectFXAA.uniforms["resolution"].value.set(
        1 / this.renderer.domElement.clientWidth,
        1 / this.renderer.domElement.clientHeight
      );
      this.composer.addPass(effectFXAA);

      const outlinePassParams = getParams(this.data.customOutlineParams);
      const uniforms = customOutline.fsQuad.material.uniforms;
      uniforms.multiplierParameters.value.x = outlinePassParams.depthBias;
      uniforms.multiplierParameters.value.y = outlinePassParams.depthMult;
      uniforms.multiplierParameters.value.z = outlinePassParams.normalBias;
      uniforms.multiplierParameters.value.w = outlinePassParams.normalMult;
      uniforms.outlineColor.value.set(outlinePassParams.outlineColor);
    } else if (this.data.effect === "moebius") {
      if (
        document.querySelectorAll("a-entity[gaussian-splatting]").length > 0
      ) {
        return;
      } else if (document.querySelectorAll("[gltf-model]").length > 0) {
        const pencilLinePass2 = new PencilLinesPass2(
          this.renderer.domElement.clientWidth,
          this.renderer.domElement.clientHeight,
          this.scene,
          this.camera
        );

        const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);

        this.composer.addPass(renderPass);
        this.composer.addPass(gammaCorrectionPass);
        this.composer.addPass(pencilLinePass2);
      }
    }

    this.bind();
  },

  bind: function () {
    const self = this;
    let isRendering = false;

    this.renderer.render = function () {
      if (isRendering) {
        self.originalRender.apply(this, arguments);
      } else {
        isRendering = true;
        if (self.occlusionComposer) {
          self.occlusionComposer.render(self.delta);
        } else if (self.composer) {
          self.composer.render(self.delta);
        }
        isRendering = false;
      }
    };
  },
});
