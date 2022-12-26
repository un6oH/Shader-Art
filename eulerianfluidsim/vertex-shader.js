const VERTEX_SHADER = `
precision mediump float;

attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform vec2 u_textureResolution;
uniform vec2 u_canvasResolution;
uniform bool u_display;

varying vec2 v_texCoord;

void main() {
  if (u_display) {
    vec2 normPosition = a_position / u_canvasResolution;
    vec2 clipSpace = normPosition * 2.0 - 1.0;

    gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
    
    v_texCoord = a_texCoord;
  } else {
    vec2 normPosition = a_position / u_textureResolution;
    vec2 clipSpace = normPosition * 2.0 - 1.0;

    gl_Position = vec4(clipSpace, 0.0, 1.0);
    
    v_texCoord = a_texCoord;
  }
}
`