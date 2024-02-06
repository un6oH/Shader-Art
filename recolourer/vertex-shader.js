const TEXTURE_VS = `#version 300 es
precision highp float;

in vec2 position; // (0, 0) to (1, 1)

out vec2 texCoord;

void main() {
  gl_Position = vec4(position * vec2(1, -1) * 2.0 + vec2(-1, 1), 0, 1);

  texCoord = position;
}
`;