const TEXTURE_VS = `#version 300 es
precision mediump float;

in vec2 position; // (0, 0) to (1, 1)

uniform bool invertTexture;

out vec2 texCoord;

void main() {
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);

  texCoord = invertTexture ? position * vec2(1, -1) + vec2(0, 1) : position;
}
`