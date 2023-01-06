const ADD_SOURCE_FRAG = `
#define REAL(x) tan(3.14159265359 * ((x) - 0.5))
#define CLAMP(x) atan(x) / 3.14159265359 + 0.5
precision highp float;

uniform vec2 u_textureResolution;
uniform sampler2D u_field;
uniform sampler2D u_source;
uniform float u_deltaTime;

varying vec2 v_texCoord;

void main() {
  vec2 texCoord = v_texCoord / u_textureResolution;
  vec3 field = texture2D(u_field, texCoord).xyz;
  vec3 source = texture2D(u_source, texCoord).xyz;
  vec3 f_real = vec3(REAL(field.x), REAL(field.y), REAL(field.z));
  vec3 s_real = vec3(REAL(source.x), REAL(source.y), REAL(source.z));
  f_real += s_real * u_deltaTime;

  gl_FragColor = vec4(CLAMP(f_real), 1.0);
}
`;

const DIFFUSE_FRAG = `
#define REAL(x) tan(3.14159265359 * ((x) - 0.5))
#define CLAMP(x) atan(x) / 3.14159265359 + 0.5
precision highp float;

uniform vec2 u_textureResolution; // constant
uniform sampler2D u_field;
uniform sampler2D u_field0;
uniform float u_diffusionRate;
uniform float u_deltaTime; // constant
uniform bool u_fieldType; // false: velocity; true: density

varying vec2 v_texCoord;

void main() {
  vec2 onePixel = 1.0 / u_textureResolution;
  vec2 texCoord = v_texCoord * onePixel;
  vec3 field = texture2D(u_field, texCoord).xyz;
  if (texCoord.x == 0.0 || texCoord.x == 1. - onePixel.x || texCoord.y == 0.0 || texCoord.y == 1. - onePixel.y) { // skip edges
    gl_FragColor = vec4(field, 1.0);
    return;
  }

  vec2 texCoord_l = (v_texCoord + vec2(-1.0, 0.0)) * onePixel;
  vec2 texCoord_r = (v_texCoord + vec2(1.0, 0.0)) * onePixel;
  vec2 texCoord_t = (v_texCoord + vec2(0.0, -1.0)) * onePixel;
  vec2 texCoord_b = (v_texCoord + vec2(0.0, 1.0)) * onePixel;

  vec3 field0 = texture2D(u_field0, texCoord).xyz;

  float a = u_deltaTime * u_diffusionRate;

  if (!u_fieldType) {
    vec2 v_l = REAL(texture2D(u_field, texCoord_l).xy);
    vec2 v_r = REAL(texture2D(u_field, texCoord_r).xy);
    vec2 v_t = REAL(texture2D(u_field, texCoord_t).xy);
    vec2 v_b = REAL(texture2D(u_field, texCoord_b).xy);

    vec2 v0 = REAL(field0.xy);
    vec2 vel = (v0 + a*(v_l + v_r + v_t + v_b)) / (1.0 + 4.0*a);
    gl_FragColor = vec4(CLAMP(vel), field.z, 1.0);
  } else {
    float d_l = REAL(texture2D(u_field, (v_texCoord + vec2(-1.0, 0.0)) * onePixel).z);
    float d_r = REAL(texture2D(u_field, texCoord_r).z);
    float d_t = REAL(texture2D(u_field, texCoord_t).z);
    float d_b = REAL(texture2D(u_field, texCoord_b).z);

    float d0 = REAL(field0.z);
    float d = (d0 + a*(d_l + d_r + d_t + d_b)) / (1.0 + 4.0*a);
    gl_FragColor = vec4(field.xy, CLAMP(d), 1.0);
  }
}
`;

const SET_FIELD0_FRAG = `
precision highp float;

uniform vec2 u_textureResolution;
uniform sampler2D u_field;

varying vec2 v_texCoord;

void main() {
  gl_FragColor = texture2D(u_field, v_texCoord / u_textureResolution);
}
`

const ADVECT_FRAG = `
#define REAL(x) tan(3.14159265359 * ((x) - 0.5))
#define CLAMP(x) atan(x) / 3.14159265359 + 0.5
precision highp float;

uniform vec2 u_textureResolution;
uniform sampler2D u_field;
uniform float u_deltaTime;
uniform int u_fieldType;

varying vec2 v_texCoord;

void main() {
  vec2 onePixel = 1.0 / u_textureResolution;
  vec2 texCoord = v_texCoord * onePixel;
  vec3 field = texture2D(u_field, texCoord).xyz;
  if (texCoord.x == 0. || texCoord.x == 1. - onePixel.x || texCoord.y == 0. || texCoord.y == 1. - onePixel.y) {
    gl_FragColor = vec4(field, 1.0);
    return;
  }

  float dt0 = u_deltaTime * sqrt(u_textureResolution.x * u_textureResolution.y);

  vec2 vel = REAL(field.xy);
  vec2 pos = v_texCoord - (dt0 * vel); // position of 'particle' in previous time step
  vec2 pos0 = floor(pos);
  vec2 pos1 = pos0 + 1.0;
  float s1 = pos1.x - pos.x; 
  float s0 = 1.0 - s1;
  float t1 = pos1.y - pos.y;
  float t0 = 1.0 - t1;

  vec2 coord00 = vec2(pos0.x + 0.5, pos0.y + 0.5) * onePixel;
  vec2 coord01 = vec2(pos0.x + 0.5, pos1.y + 0.5) * onePixel;
  vec2 coord10 = vec2(pos1.x + 0.5, pos0.y + 0.5) * onePixel;
  vec2 coord11 = vec2(pos1.x + 0.5, pos1.y + 0.5) * onePixel;

  if (u_fieldType == 0) {
    vec2 v00 = REAL(texture2D(u_field, coord00).xy); 
    vec2 v01 = REAL(texture2D(u_field, coord01).xy); 
    vec2 v10 = REAL(texture2D(u_field, coord10).xy); 
    vec2 v11 = REAL(texture2D(u_field, coord11).xy); 

    vec2 v;
    v.x = s0*t0*v00.x + s0*t1*v01.x + s1*t0*v10.x + s1*t1*v11.x;
    v.y = s0*t0*v00.y + s0*t1*v01.y + s1*t0*v10.y + s1*t1*v11.y;
    gl_FragColor = vec4(CLAMP(v), field.z, 1.0);
  } else {
    float d00 = REAL(texture2D(u_field, coord00).z);
    float d01 = REAL(texture2D(u_field, coord01).z);
    float d10 = REAL(texture2D(u_field, coord10).z);
    float d11 = REAL(texture2D(u_field, coord11).z);

    float d = s0*t0*d00 + s0*t1*d01 + s1*t0*d10 + s1*t1*d11;
    gl_FragColor = vec4(field.xy, CLAMP(d), 1.0);
  }
}
`

//
// project
//
const CALC_DIV_FIELD_FRAG = `
#define REAL(x) tan(3.14159265359 * ((x) - 0.5))
#define CLAMP(x) atan(x) / 3.14159265359 + 0.5
precision highp float;

uniform vec2 u_textureResolution; // constant
uniform sampler2D u_field;
uniform float h; // constant

varying vec2 v_texCoord;

void main() {
  vec2 onePixel = 1.0 / u_textureResolution;
  vec2 texCoord = v_texCoord * onePixel;
  vec3 field = texture2D(u_field, v_texCoord * onePixel).xyz;
  if (texCoord.x == 0. || texCoord.x == 1. - onePixel.x || texCoord.y == 0. || texCoord.y == 1. - onePixel.y) {
    gl_FragColor = vec4(vec3(0.), 1.0);
    return;
  }

  float u_l = REAL(texture2D(u_field, (v_texCoord + vec2(-1.0, 0.0)) * onePixel).x);
  float u_r = REAL(texture2D(u_field, (v_texCoord + vec2(1.0, 0.0)) * onePixel).x);
  float v_t = REAL(texture2D(u_field, (v_texCoord + vec2(0.0, -1.0)) * onePixel).y);
  float v_b = REAL(texture2D(u_field, (v_texCoord + vec2(0.0, 1.0)) * onePixel).y);

  float div = -0.5 * h * (u_r - u_l + v_b - v_t);
  gl_FragColor = vec4(vec3(CLAMP(div)), 1.0);
}
`

const CALC_GRADIENT_FIELD_FRAG = `
#define REAL(x) tan(3.14159265359 * ((x) - 0.5))
#define CLAMP(x) atan(x) / 3.14159265359 + 0.5
precision highp float;

uniform vec2 u_textureResolution;
uniform sampler2D u_gradientField;
uniform sampler2D u_divField;

varying vec2 v_texCoord;

void main() {
  vec2 onePixel = 1.0 / u_textureResolution;
  vec2 texCoord = v_texCoord * onePixel;
  float p_clamp = texture2D(u_gradientField, texCoord).z;
  if (texCoord.x == 0. || texCoord.x == 1. - onePixel.x || texCoord.y == 0. || texCoord.y == 1. - onePixel.y) {
    gl_FragColor = vec4(vec3(p_clamp), 1.0);
    return;
  }

  float div = REAL(texture2D(u_divField, texCoord).z);
  float p_l = REAL(texture2D(u_gradientField, (v_texCoord + vec2(-1.0, 0.0)) * onePixel).z);
  float p_r = REAL(texture2D(u_gradientField, (v_texCoord + vec2(1.0, 0.0)) * onePixel).z);
  float p_t = REAL(texture2D(u_gradientField, (v_texCoord + vec2(0.0, -1.0)) * onePixel).z);
  float p_b = REAL(texture2D(u_gradientField, (v_texCoord + vec2(0.0, 1.0)) * onePixel).z);

  float p = (div + p_l + p_r + p_t + p_b) / 4.0;
  gl_FragColor = vec4(vec3(CLAMP(p)), 1.0);
}
`

const CALC_MASS_CONSERVING_FIELD_FRAG = `
#define REAL(x) tan(3.14159265359 * ((x) - 0.5))
#define CLAMP(x) atan(x) / 3.14159265359 + 0.5
precision highp float;

uniform vec2 u_textureResolution;
uniform sampler2D u_field;
uniform sampler2D u_gradientField;
uniform float h;

varying vec2 v_texCoord;

void main() {
  vec2 onePixel = 1.0 / u_textureResolution;
  vec2 texCoord = v_texCoord * onePixel;
  vec3 field = texture2D(u_field, v_texCoord * onePixel).xyz;
  if (texCoord.x == 0. || texCoord.x == 1. - onePixel.x || texCoord.y == 0. || texCoord.y == 1. - onePixel.y) {
    gl_FragColor = vec4(field, 1.0);
    return;
  }

  float p_l = REAL(texture2D(u_gradientField, (v_texCoord + vec2(-1.0, 0.0)) * onePixel).z);
  float p_r = REAL(texture2D(u_gradientField, (v_texCoord + vec2(1.0, 0.0)) * onePixel).z);
  float p_t = REAL(texture2D(u_gradientField, (v_texCoord + vec2(0.0, -1.0)) * onePixel).z);
  float p_b = REAL(texture2D(u_gradientField, (v_texCoord + vec2(0.0, 1.0)) * onePixel).z);

  vec2 vel = REAL(field.xy);
  vel.x -= 0.5 * (p_r - p_l) / h;
  vel.y -= 0.5 * (p_b - p_t) / h;

  gl_FragColor = vec4(CLAMP(vel), field.z, 1.0);
}
`

const SET_BOUNDARIES_FRAG = `
#define REAL(x) tan(3.14159265359 * ((x) - 0.5))
#define CLAMP(x) atan(x) / 3.14159265359 + 0.5
precision highp float;

uniform vec2 u_textureResolution;
uniform sampler2D u_boundaries;
uniform sampler2D u_field;
uniform int u_boundaryType;

varying vec2 v_texCoord;

void main() {
  vec2 onePixel = 1.0 / u_textureResolution;
  vec2 texCoord = v_texCoord * onePixel;
  vec2 texCoord_l = (v_texCoord + vec2(-1.0, 0.0)) * onePixel;
  vec2 texCoord_r = (v_texCoord + vec2(1.0, 0.0)) * onePixel;
  vec2 texCoord_t = (v_texCoord + vec2(0.0, -1.0)) * onePixel;
  vec2 texCoord_b = (v_texCoord + vec2(0.0, 1.0)) * onePixel;

  float b = texture2D(u_boundaries, texCoord).a; // opacity 0 - 1
  float b_l = texture2D(u_boundaries, texCoord_l).a;
  float b_r = texture2D(u_boundaries, texCoord_r).a;
  float b_t = texture2D(u_boundaries, texCoord_t).a;
  float b_b = texture2D(u_boundaries, texCoord_b).a;

  vec3 field = texture2D(u_field, texCoord).xyz;

  if (b == 0.0) {
    gl_FragColor = vec4(field, 1.);
    return;
  }

  if (u_boundaryType == 0) { // velocity; zero xy
    vec2 v_l = REAL(texture2D(u_field, texCoord_l).xy);
    vec2 v_r = REAL(texture2D(u_field, texCoord_r).xy);
    vec2 v_t = REAL(texture2D(u_field, texCoord_t).xy);
    vec2 v_b = REAL(texture2D(u_field, texCoord_b).xy);

    vec2 direction = vec2(0.5*(b_r + b_l), 0.5*(b_t + b_b));
    vec2 v;
    v.x = direction.x * (v_l.x*(1.0 - b_l) + v_r.x*(1.0 - b_r) + v_t.x*(1.0 - b_t) + v_b.x*(1.0 - b_b));
    v.x = direction.y * (v_l.y*(1.0 - b_l) + v_r.y*(1.0 - b_r) + v_t.y*(1.0 - b_t) + v_b.y*(1.0 - b_b));
    gl_FragColor = vec4(CLAMP(v), field.z, 1.0);
  } else if (u_boundaryType == 1) { // density, div, gradient; continuous z
    float x_l = REAL(texture2D(u_field, texCoord_l).z);
    float x_r = REAL(texture2D(u_field, texCoord_r).z);
    float x_t = REAL(texture2D(u_field, texCoord_t).z);
    float x_b = REAL(texture2D(u_field, texCoord_b).z);

    float w_l = 1.0 - b_l;
    float w_r = 1.0 - b_r;
    float w_t = 1.0 - b_t;
    float w_b = 1.0 - b_b;
    
    float totalWeight = w_l + w_r + w_t + w_b;
    float total = x_l*w_l + x_r*w_r + x_t*w_t + x_b*w_b;
    float x;
    if (totalWeight > 0.) {
      x = total / totalWeight;
    } else {
      x = 0.;
    }
    gl_FragColor = vec4(field.xy, CLAMP(x), 1.);
  }
}
`

const DISPLAY_FRAG = `
// #define REAL(x) tan(3.14159265359 * ((x) - 0.5))
// #define CLAMP(x) atan(x) / 3.14159265359 + 0.5
precision highp float;

uniform sampler2D u_field;
uniform sampler2D u_boundaries;

varying vec2 v_texCoord;

void main() {
  // float d = texture2D(u_field, v_texCoord).z;
  // gl_FragColor = vec4(vec3(d), 1.0);
  vec3 field = texture2D(u_field, v_texCoord).xyz;
  float b = texture2D(u_boundaries, v_texCoord).a;
  gl_FragColor = vec4(field, 1.0);
}
`;