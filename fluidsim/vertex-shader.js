const BUFFER_VERT = `
precision highp float;

attribute vec2 a_position;

uniform vec2 u_textureResolution;

varying vec2 v_texCoord;
varying vec2 v_texCoord_l;
varying vec2 v_texCoord_r;
varying vec2 v_texCoord_t;
varying vec2 v_texCoord_b;

void main() {
  vec2 onePixel = 1.0 / u_textureResolution;
  vec2 normCoord = a_position * onePixel;
  vec2 clipSpace = normCoord * 2.0 - 1.0;
  gl_Position = vec4(clipSpace, 0.0, 1.0);

  v_texCoord = normCoord;
  v_texCoord_l = (a_position + vec2(-1.0, 0.0)) * onePixel;
  v_texCoord_r = (a_position + vec2(1.0, 0.0)) * onePixel;
  v_texCoord_t = (a_position + vec2(0.0, -1.0)) * onePixel;
  v_texCoord_b = (a_position + vec2(0.0, 1.0)) * onePixel; 
}
`

const CANVAS_VERT = `
precision highp float;

attribute vec2 a_position;

uniform vec2 u_canvasResolution;
uniform vec2 u_textureResolution;

varying vec2 v_texCoord;

void main() {
  vec2 normCoord = a_position / u_canvasResolution;
  vec2 clipSpace = normCoord * 2.0 - 1.0;
  vec2 offset = 1.0 / (u_textureResolution - 2.0);

  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);

  vec2 onePixel = 1.0 / u_textureResolution;
  vec2 texCoord = normCoord * (u_textureResolution - 2.0) * onePixel;
  texCoord += onePixel;
  v_texCoord = texCoord;
}
`;
