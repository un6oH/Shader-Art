const DIFFUSE_VS = `#version 300 es
precision highp float;

in vec2 position; // (0, 0) to (1, 1)

uniform vec2 textureDimensions;

out vec2 texCoord;
out vec2 texCoord_l;
out vec2 texCoord_r;
out vec2 texCoord_t;
out vec2 texCoord_b;

void main() {
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);

  vec2 onePixel = 1.0 / textureDimensions;
  texCoord = position;
  texCoord_l = position + vec2(-1, 0) * onePixel;
  texCoord_r = position + vec2(1, 0) * onePixel;
  texCoord_t = position + vec2(0, -1) * onePixel;
  texCoord_b = position + vec2(0, 1) * onePixel; 
}
`

const TEXTURE_VS = `#version 300 es
precision highp float;

in vec2 position;

out vec2 texCoord;

void main() {
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
  texCoord = position;
}

`

const CANVAS_VS = `#version 300 es
precision highp float;

in vec2 position;

out vec2 texCoord;

void main() {
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
  texCoord = position * vec2(1, -1) + vec2(0, 1);
}
`;
