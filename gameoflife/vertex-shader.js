const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform vec2 u_resolution;
uniform bool u_updateCells;

varying vec2 v_texCoord;

void main() {
  vec2 normPosition = a_position / u_resolution;
  vec2 clipSpace = normPosition *  2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1.0, u_updateCells ? 1.0 : -1.0), 0, 1);

  v_texCoord = a_texCoord;
}
`