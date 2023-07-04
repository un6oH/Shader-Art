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




// correct volume
const CALC_EDGES_VS = 
`#version 300 es

in float prevX1;
in float y;

uniform sampler2D depthTexture;
uniform vec2 textureDimensions;

flat out float newX0;
flat out float newX1;
flat out float depth;

void main() {
  if (prevX1 >= textureDimensions.x) {
    newX0 = textureDimensions.x;
    newX1 = textureDimensions.x;
    depth = 0.0;
    return;
  }

  float x0 = prevX1 + 1.0;
  float x1 = textureDimensions.x - 1.0;
  ivec2 texCoord = ivec2(x0, y);

  bool hasVolume = texelFetch(depthTexture, texCoord, 0).x > 0.0;
  for (float x = x0 + 1.0; x < textureDimensions.x; x += 1.0) {
    texCoord.x = int(x);
    if ((texelFetch(depthTexture, texCoord, 0).x > 0.0) != hasVolume) {
      x1 = x - 1.0;
      break;
    }
  }

  newX0 = x0;
  newX1 = x1;
  depth = hasVolume ? 1.0 : 0.0;
}
`;

const CALC_EXCESS_VS = 
`#version 300 es

in float x0;
in float x1;
in float depth;
in float y;

uniform vec2 textureDimensions;
uniform sampler2D heightTexture;
uniform sampler2D heightn1Texture;
uniform sampler2D depthTexture;

out float excess;

void main() {
  if (depth == 0.0) {
    excess = 0.0;
    return;
  }

  ivec2 texCoord = ivec2(x0, y);
  float volume = 0.0;
  float prevVolume = 0.0;
  for (float x = x0; x <= x1; x += 1.0) {
    volume += texelFetch(heightTexture, texCoord, 0).x;
    prevVolume += texelFetch(heightn1Texture, texCoord, 0).x;
    texCoord.x += 1;
  }
  float n = 1.0 + x1 - x0;
  excess = (volume - prevVolume) / n;
}
`;

const COMPILE_COORDS_VS = 
`#version 300 es

in float x0;
in float x1;
in float y;

out float v_x0;
out float v_y0;
out float v_x1;
out float v_y1;

void main() {
  v_x0 = x0;
  v_y0 = y;
  v_x1 = x1 + 1.0;
  v_y1 = y + 1.0;
}
`;

const DUPLICATE_EXCESS_BUFFER_VS = 
`#version 300 es

in float excess;

out float v_excess;
out float v_copy;

void main() {
  v_excess = excess;
  v_copy = excess;
}
`

const SET_EXCESS_VS = 
`#version 300 es
precision highp float;

in vec2 position; // pixel coordinates
in float excess;

uniform vec2 textureDimensions;
uniform bool rotated;

out float v_excess;
out vec2 v_texCoord;

void main() {
  vec2 pos = rotated ? vec2(textureDimensions.x - position.y, position.x) : position.xy;
  vec2 normCoord = pos / textureDimensions;
  vec2 clipSpace = normCoord * 2.0 - 1.0;
  gl_Position = vec4(clipSpace, 0, 1);

  v_excess = excess * 0.5;
  v_texCoord = pos;
}
`





// rotate textures
const ROTATE_TEXTURE_VS = 
`#version 300 es

in vec2 position; // clip space coordinates

uniform mat3 matrix;

out vec2 v_texCoord; // texture coordinates

void main() {
  gl_Position = vec4(position, 0, 1);
  v_texCoord = (matrix * vec3(position, 1)).xy * 0.5 + 0.5;
}
`