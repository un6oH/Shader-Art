const UPDATE_VS = `#version 300 es
precision highp float;

in vec2 position;

uniform vec2 gridSize;

out vec2 texCoords[9];

void main() {
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);

  vec2 onePixel = 1.0 / gridSize;
  int i = 0;
  for (int y = -1; y < 2; y++) {
    for (int x = -1; x < 2; x++) {
      texCoords[i] = vec2(position) + onePixel * vec2(x, y);
      i++;
    }
  }
}
`;

const TEXTURE_VS = `#version 300 es
precision highp float;

in vec2 position; // (0, 0) to (1, 1)

uniform bool invertTexture;

out vec2 texCoord;

void main() {
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);

  texCoord = invertTexture ? position * vec2(1, -1) + vec2(0, 1) : position;
}
`