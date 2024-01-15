const IMAGE_TO_FIELD_FS = `#version 300 es
precision highp float;

in vec2 texCoord;

uniform sampler2D image;
uniform float scale;

out vec3 value;

float centre = 127.0 / 255.0;
float normaliseFactor = 128.0 / 255.0;

void main() {
  vec3 rgb = texture(image, texCoord).rgb;
  value = (rgb - centre) / normaliseFactor * scale;
}
`;

const ADD_SOURCE_FS = `#version 300 es
precision highp float;

in vec2 texCoord; // (0, 0) to (1, 1)

uniform sampler2D fieldTexture; // RGB32F (velocity in pixel/s, density in AU) 
uniform sampler2D sourceTexture; // RGB32F
uniform vec2 textureDimensions;
uniform float deltaTime;
uniform int inputMode; // 0: from image; 1: mouse input
uniform vec2 mousePos; // (0, 0) to (1, 1)
uniform vec2 mouseVel; // pixels / second
uniform float splatDensity;
uniform float splatRadius; // pixel scale

out vec3 value;

void main() {
  vec3 field = texture(fieldTexture, texCoord).xyz;

  if (inputMode == 0) { // from image
    vec3 source = texture(sourceTexture, texCoord).xyz;
    field += (source - field) * deltaTime;
  } else {
    float distance = distance(texCoord * textureDimensions, mousePos);
    float weight = 1.0 - smoothstep(0.0, splatRadius, distance);
    field += vec3(mouseVel, splatDensity) * deltaTime * weight;
  }

  value = field;
}
`;

const DIFFUSE_VELOCITY_FS = `#version 300 es
precision highp float;

in vec2 texCoord;
in vec2 texCoord_l;
in vec2 texCoord_r;
in vec2 texCoord_t;
in vec2 texCoord_b;

uniform sampler2D field0Texture; // n - 2
uniform sampler2D fieldTexture; // n - 1
uniform vec2 textureDimensions;
uniform float diffusionRate;
uniform float deltaTime; // constant

out vec3 value;

void main() {
  vec3 field0 = texture(field0Texture, texCoord).xyz;
  vec3 field = texture(fieldTexture, texCoord).xyz;

  float a = deltaTime * diffusionRate * textureDimensions.x * textureDimensions.y;

  vec2 l = texture(fieldTexture, texCoord_l).xy;
  vec2 r = texture(fieldTexture, texCoord_r).xy;
  vec2 t = texture(fieldTexture, texCoord_t).xy;
  vec2 b = texture(fieldTexture, texCoord_b).xy;

  vec2 v0 = field0.xy;
  vec2 vel = (v0 + a*(l + r + t + b)) / (1.0 + 4.0*a);
  
  value = vec3(vel, field0.z);
}
`;

const DIFFUSE_DENSITY_FS = `#version 300 es
precision highp float;

in vec2 texCoord;
in vec2 texCoord_l;
in vec2 texCoord_r;
in vec2 texCoord_t;
in vec2 texCoord_b;

uniform sampler2D field0Texture; // n - 2
uniform sampler2D fieldTexture; // n - 1
uniform vec2 textureDimensions; // constant
uniform float diffusionRate;
uniform float deltaTime;

out vec3 value;

void main() {
  vec3 field0 = texture(field0Texture, texCoord).xyz;
  vec3 field = texture(fieldTexture, texCoord).xyz;

  float a = deltaTime * diffusionRate * textureDimensions.x * textureDimensions.y;

  float l = texture(fieldTexture, texCoord_l).z;
  float r = texture(fieldTexture, texCoord_r).z;
  float t = texture(fieldTexture, texCoord_t).z;
  float b = texture(fieldTexture, texCoord_b).z;

  float d0 = field0.z;
  float d = (d0 + a*(l + r + t + b)) / (1.0 + 4.0*a);
  value = vec3(field0.xy, d);
}
`;

const ADVECT_VELOCITY_FS = `#version 300 es
precision highp float;

in vec2 texCoord;

uniform sampler2D fieldTexture;
uniform vec2 textureDimensions;
uniform float deltaTime;

out vec3 value;

void main() {
  vec3 field = texture(fieldTexture, texCoord).xyz;

  vec2 vel = field.xy;
  vec2 pos = texCoord - vel * deltaTime / textureDimensions; // position of 'particle' in previous time step

  vec2 v = texture(fieldTexture, pos).xy;
  value = vec3(v, field.z);
}
`

const ADVECT_DENSITY_FS = `#version 300 es
precision highp float;

in vec2 texCoord;

uniform sampler2D fieldTexture;
uniform vec2 textureDimensions;
uniform float deltaTime;

out vec3 value;

void main() {
  vec3 field = texture(fieldTexture, texCoord).xyz;

  vec2 vel = field.xy;
  vec2 pos = texCoord - vel * deltaTime / textureDimensions;

  float d = texture(fieldTexture, pos).z;
  value = vec3(field.xy, d);
}
`

//
// project
//
const CALC_DIV_FIELD_FS = `#version 300 es
precision highp float;

in vec2 texCoord;
in vec2 texCoord_l;
in vec2 texCoord_r;
in vec2 texCoord_t;
in vec2 texCoord_b;

uniform sampler2D fieldTexture;
uniform vec2 textureDimensions;
uniform float h; // 1 / sqrt(area)

out float div;

void main() {
  vec3 field = texture(fieldTexture, texCoord).xyz;

  float l = texture(fieldTexture, texCoord_l).x;
  float r = texture(fieldTexture, texCoord_r).x;
  float t = texture(fieldTexture, texCoord_t).y;
  float b = texture(fieldTexture, texCoord_b).y;

  div = -0.5 * h * (r - l + b - t);
}
`

const CALC_GRADIENT_FIELD_FS = `#version 300 es
precision highp float;

in vec2 texCoord;
in vec2 texCoord_l;
in vec2 texCoord_r;
in vec2 texCoord_t;
in vec2 texCoord_b;

uniform sampler2D gradientField;
uniform sampler2D divField;
uniform vec2 textureDimensions;
uniform float overRelaxation;

out float gradient;

void main() {
  float div = texture(divField, texCoord).x;
  float p_l = texture(gradientField, texCoord_l).x;
  float p_r = texture(gradientField, texCoord_r).x;
  float p_t = texture(gradientField, texCoord_t).x;
  float p_b = texture(gradientField, texCoord_b).x;

  gradient = (div + p_l + p_r + p_t + p_b) / (4.0 + overRelaxation);
}
`

const CALC_MASS_CONSERVING_FIELD_FS = `#version 300 es
precision highp float;

in vec2 texCoord;
in vec2 texCoord_l;
in vec2 texCoord_r;
in vec2 texCoord_t;
in vec2 texCoord_b;

uniform sampler2D fieldTexture;
uniform sampler2D gradientField;
uniform vec2 textureDimensions;

out vec3 value;

void main() {
  vec3 field = texture(fieldTexture, texCoord).xyz;

  float p_l = texture(gradientField, texCoord_l).x;
  float p_r = texture(gradientField, texCoord_r).x;
  float p_t = texture(gradientField, texCoord_t).x;
  float p_b = texture(gradientField, texCoord_b).x;

  vec2 vel = field.xy;
  vel.x -= 0.5 * (p_r - p_l);
  vel.y -= 0.5 * (p_b - p_t);

  value = vec3(vel, field.z);
}
`

const SET_BOUNDARY_VELOCITY_FS = `#version 300 es
precision highp float;

in vec2 texCoord;

uniform sampler2D boundaries;
uniform sampler2D fieldTexture;
uniform vec2 textureDimensions;
uniform float boundaryFriction;

out vec3 value;

void main() {
  float b[9];
  b[4] = texture(boundaries, texCoord).a; // opacity 0 - 1
  vec3 field = texture(fieldTexture, texCoord).xyz;

  if (b[4] == 0.0) {
    value = field;
    return;
  }

  vec2 avgVel;
  float totalWeight;
  int i = 0;
  vec2 onePixel = 1.0 / textureDimensions;
  vec2 normal = vec2(0.0);
  float slip = 1.0 - boundaryFriction;
  for (float x = -1.0 ; x <= 1.0; x += 1.0) {
    for (float y = -1.0 ; y <= 1.0; y += 1.0) {
      vec2 coord = texCoord + vec2(x, y) * onePixel;
      b[i] = texture(boundaries, coord).a;
      float weight = (1.0 - b[i]) * slip;
      totalWeight += weight;
      avgVel += texture(fieldTexture, coord).xy * weight;
      normal += vec2(x, y) * weight;
      i++;
    }
  }
  avgVel = avgVel / totalWeight;

  if (length(normal) == 0.0) {
    value = vec3(avgVel * (1.0 - b[4]), field.z);
    return;
  }

  vec2 tangent = cross(vec3(normal, 0), vec3(0, 0, -1)).xy;
  vec2 direction = normalize(tangent);
  vec2 proj = dot(avgVel, direction) * direction;
  value = vec3(proj, field.z);
}
`

const SET_BOUNDARY_DENSITY_FS = `#version 300 es
precision highp float;

in vec2 texCoord;
in vec2 texCoord_l;
in vec2 texCoord_r;
in vec2 texCoord_t;
in vec2 texCoord_b;

uniform sampler2D boundaries;
uniform sampler2D fieldTexture;

out vec3 value;

void main() {
  float b   = texture(boundaries, texCoord).a; // opacity 0 - 1
  float b_l = texture(boundaries, texCoord_l).a;
  float b_r = texture(boundaries, texCoord_r).a;
  float b_t = texture(boundaries, texCoord_t).a;
  float b_b = texture(boundaries, texCoord_b).a;

  vec3 field = texture(fieldTexture, texCoord).xyz;

  if (b == 0.0) {
    value = field;
    return;
  }

  float x_l = texture(fieldTexture, texCoord_l).z;
  float x_r = texture(fieldTexture, texCoord_r).z;
  float x_t = texture(fieldTexture, texCoord_t).z;
  float x_b = texture(fieldTexture, texCoord_b).z;

  float w_l = 1.0 - b_l;
  float w_r = 1.0 - b_r;
  float w_t = 1.0 - b_t;
  float w_b = 1.0 - b_b;
  
  float totalWeight = w_l + w_r + w_t + w_b;
  float total = x_l*w_l + x_r*w_r + x_t*w_t + x_b*w_b;
  float x;
  if (totalWeight > 0.0) {
    x = total / totalWeight;
  } else {
    x = 0.0;
  }
  value = vec3(field.xy, x);
}
`;

const DRAW_TEXTURE_FS = `#version 300 es
#define CLAMP(x) atan(x) / 3.14159265359 + 0.5
precision highp float;

in vec2 texCoord;

uniform sampler2D u_texture;
uniform bool clampField;

out vec4 colour;

void main() {
  vec4 value = texture(u_texture, texCoord);
  if (clampField) {
    value.xyz = CLAMP(value.xyz);
  }
  colour = value;
}
`;

const DISPLAY_FS = `#version 300 es
#define CLAMP(x) atan(x) / 3.14159265359 + 0.5
precision highp float;

in vec2 texCoord;

uniform sampler2D fieldTexture;
uniform sampler2D prevField;
uniform sampler2D boundaries;
uniform int displayMode;
uniform bool showBoundaries;

out vec4 colour;

vec4 hsla2rgba(vec4 hsla) {
  float h = hsla.x * 360.0;
  vec3 rgb;
  rgb.r = 1.0 - smoothstep(60.0, 120.0, h) + smoothstep(240.0, 300.0, h);
  rgb.g = smoothstep(0.0, 60.0, h) - smoothstep(180.0, 240.0, h);
  rgb.b = smoothstep(120.0, 180.0, h) - smoothstep(300.0, 360.0, h);

  rgb += (1.0 - rgb) * (1.0 - hsla.y);
  rgb *= hsla.z;

  return vec4(rgb, hsla.a);
}

void main() {
  vec3 field = texture(fieldTexture, texCoord).xyz;

  vec4 col = vec4(vec3(0), 1);
  if (displayMode == 0) { // density gray
    col.xyz = vec3(CLAMP(field.z) * 2.0 - 1.0);
    // col.xyz = vec3(0.5, 0.5, 0.5);
  } else if (displayMode == 1) { // density hue
    float h = field.z;
    col = hsla2rgba(vec4(h, 1, 1, 1));
  } else if (displayMode == 2) { // velocity h, density sl
    col = hsla2rgba(vec4(CLAMP(length(field.xy)) * 2.0 - 1.0, vec2(CLAMP(field.z) * 2.0 - 1.0), 1));
  } else if (displayMode == 3) { // field

  } else if (displayMode == 4) { // acceleration hue

  }

  if (showBoundaries) {
    float b = texture(boundaries, texCoord).a;
    col.rgb *= (1.0 - b);
  }

  colour = col;
}
`;