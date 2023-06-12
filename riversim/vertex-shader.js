const CANVAS_VS = 
`#version 300 es
precision highp float;

in vec2 position; // canvas coordinates

uniform vec2 canvasDimensions;

out vec2 texCoord;

void main() {
  vec2 normCoords = position / canvasDimensions;
  vec2 clipSpace = normCoords * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

  texCoord = normCoords;
}
`

const TEXTURE_VS = 
`#version 300 es
precision highp float;

in vec2 position; // pixel coordinates

uniform vec2 textureDimensions;

out vec2 v_texCoord;

void main() {
  vec2 normCoords = position / textureDimensions;
  vec2 clipSpace = normCoords * 2.0 - 1.0;
  gl_Position = vec4(clipSpace, 0, 1);

  v_texCoord = position;
}
`

