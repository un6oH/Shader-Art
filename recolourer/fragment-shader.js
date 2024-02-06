const RENDER_FS = `#version 300 es
precision mediump float;

in vec2 texCoord;

uniform sampler2D image;
uniform bool preview;
uniform int mode; // 0: colour map; 1: gradient
uniform bool rgb;
uniform mat4 colours; // list of colours
uniform vec4 levels; // positions of colours on spectrum

out vec4 colour;

vec4 rgba(vec4 hsva) {
  float r = 0.0;
  float g = 0.0;
  float b = 0.0;

  float h6 = hsva.x * 6.0;
  
  // colour wheel
  if (h6 < 1.0) {
    r = 1.0;
    g = h6;
    b = 0.0;
  } else if (h6 < 2.0) {
    r = -h6 + 2.0;
    g = 1.0;
    b = 0.0;
  } else if (h6 < 3.0) {
    r = 0.0;
    g = 1.0;
    b = h6 - 2.0;
  } else if (h6 < 4.0) {
    r = 0.0;
    g = -h6 + 4.0;
    b = 1.0;
  } else if (h6 < 5.0) {
    r = h6 - 4.0;
    g = 0.0;
    b = 1.0;
  } else {
    r = 1.0;
    g = 0.0;
    b = -h6 + 6.0;
  }

  // saturation
  float s = hsva.y;
  r = r + (1.0 - r) * (1.0 - s);
  g = g + (1.0 - g) * (1.0 - s);
  b = b + (1.0 - b) * (1.0 - s);

  // lightness
  float l = hsva.z;
  r *= l;
  g *= l;
  b *= l;

  return vec4(r, g, b, hsva.a);
}

// float lerp(float a, float b, float t) {
//   float d = b - a;
//   return a + d * t;
// }

vec4 lerp(vec4 u, vec4 v, float t) {
  vec4 d = v - u;
  return u + d * t;
}

vec4 multiLerp(mat4 colours, vec4 levels, float t) {
  vec4 result = vec4(0.0);
  if (t <= levels.x) {
    result = colours[0];
  } else if (t <= levels.y) {
    result = lerp(colours[0], colours[1], (t - levels.x) / (levels.y - levels.x));
  } else if (t <= levels.z) {
    result = lerp(colours[1], colours[2], (t - levels.y) / (levels.z - levels.y));
  } else if (t <= levels.w) {
    result = lerp(colours[2], colours[3], (t - levels.z) / (levels.w - levels.z));
  } else {
    result = colours[3];
  }
  return result;
}

void main() {
  float value = texture(image, texCoord).r;

  vec4 v = vec4(0, 0, 0, 1);
  switch(mode) {
    case 0: // colour map
      v = multiLerp(colours, levels, preview ? texCoord.x : value);
      break;
    case 1: // gradient
      vec4 y1 = lerp(colours[0], colours[3], texCoord.y);
      vec4 y2 = lerp(colours[1], colours[2], texCoord.y);
      v = vec4(lerp(y1, y2, texCoord.x).xyz * value, 1);
      break;
  }
  if (!rgb) {
    v = rgba(v);
  }
  colour = v;
}
`;

const DISPLAY_FS = `#version 300 es
precision highp float;

in vec2 texCoord;

uniform sampler2D image;

out vec4 colour;

void main() {
  colour = texture(image, texCoord);
}
`;