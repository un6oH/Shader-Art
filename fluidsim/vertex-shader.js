const BUFFER_VERT = `
attribute vec2 a_position;

uniform vec2 u_textureResolution;

varying vec2 v_texCoord;

void main() {
  vec2 normCoord = a_position / u_textureResolution;
  vec2 clipSpace = normCoord * 2.0 - 1.0;
  gl_Position = vec4(clipSpace, 0.0, 1.0);

  v_texCoord = a_position;
}
`

const CANVAS_VERT = `
attribute vec2 a_position;

uniform vec2 u_canvasResolution;

varying vec2 v_texCoord;

void main() {
  vec2 normCoord = a_position / u_canvasResolution;
  vec2 clipSpace = normCoord * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);

  v_texCoord = normCoord;
}
`;
