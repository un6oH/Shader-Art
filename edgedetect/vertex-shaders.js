const SET_EDGES_VS = 
`#version 300 es
#define LOCAL 0
#define AGGREGATE 1

in float prevX1;
in float y;

uniform sampler2D image;
uniform float textureWidth;
uniform float threshold;
uniform int mode;

flat out float newX0;
flat out float newX1;

void main() {
  ivec2 texCoord = ivec2(prevX1 + 1.0, y);
  vec3 c0 = texelFetch(image, texCoord, 0).rgb; // colour to compare new colour to
  vec3 c = vec3(0); // colour being compared

  if (prevX1 >= textureWidth - 1.0) {
    newX0 = textureWidth;
    newX1 = textureWidth;
    return;
  }

  float result = textureWidth - 1.0;
  vec3 colourSum = vec3(0);
  float n = 0.0;
  for (float x = prevX1 + 1.0; x < textureWidth; x += 1.0) {
    c = texelFetch(image, texCoord, 0).rgb;
    if (mode == AGGREGATE) {
      colourSum += c;
      n += 1.0;
      c0 = colourSum / n;
    }
    if (distance(c0, c) > threshold) {
      result = x - 1.0;
      break;
    }
    texCoord.x += 1;
    if (mode == LOCAL) c0 = c;
  }

  newX0 = prevX1 + 1.0;
  newX1 = result;
}
`;

const SET_COLOUR_VS = 
`#version 300 es

in float x0;
in float x1;
in float y;

uniform float textureWidth;
uniform sampler2D image;

out vec4 colour;

void main() {
  if (x0 == textureWidth) {
    colour = vec4(0);
    return;
  }

  ivec2 texCoord = ivec2(x0, y);

  vec3 sum = vec3(0);
  for (float x = x0; x <= x1; x += 1.0) {
    sum.rgb += texelFetch(image, texCoord, 0).rgb;
    texCoord.x += 1;
  }
  float n = x1 - x0 + 1.0;
  colour = vec4(sum / n, 1);
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
  v_x0 = x0 - 0.5;
  v_y0 = y;
  v_x1 = x1 + 0.5;
  v_y1 = y;
}
`;

const DUPLICATE_COLOUR_BUFFER_VS = 
`#version 300 es

in vec4 colour;

out vec4 v_colour;
out vec4 v_copy;

void main() {
  v_colour = colour;
  v_copy = colour;
}
`

const SHADE_RANGE_VS = 
`#version 300 es
precision highp float;

in vec2 position;
in vec4 colour;

uniform vec2 textureDimensions;

out vec4 v_colour;

void main() {
  vec2 normCoord = position / textureDimensions;
  vec2 clipSpace = normCoord * 2.0 - 1.0;
  gl_Position = vec4(clipSpace, 0, 1);
  v_colour = colour;
}
`

const DISPLAY_VS = 
`#version 300 es

in vec2 position;

out vec2 texCoord;

void main() {
  gl_Position = vec4(position, 0, 1);
  texCoord = (position * vec2(1, -1) * 0.5 + 0.5);
}
`