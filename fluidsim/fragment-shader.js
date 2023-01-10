const ADD_SOURCE_FRAG = `
#define REAL(x) tan(3.14159265359 * ((x) - (127./255.)))
precision highp float;

uniform vec2 u_textureResolution;
uniform sampler2D u_field;
uniform sampler2D u_source;
uniform int u_inputMode;
uniform vec2 u_mousePos;
uniform vec2 u_mouseVel;
uniform float u_splatDensity;
uniform float u_splatRadius;
uniform float u_deltaTime;

varying vec2 v_texCoord;

void main() {
  vec2 texCoordi = floor(v_texCoord * u_textureResolution);
  vec3 field = texture2D(u_field, v_texCoord).xyz;
  if (texCoordi.x == 0. || texCoordi.x == u_textureResolution.x - 1. || texCoordi.y == 0. || texCoordi.y == u_textureResolution.y - 1.) {
    gl_FragColor = vec4(field, 1.0);
    return;
  }

  if (u_inputMode == 0) {
    vec3 source = REAL(texture2D(u_source, v_texCoord).xyz);
    field += source * u_deltaTime;
  } else {
    float distance = distance(texCoordi, u_mousePos);
    float weight = 1.0 - smoothstep(0.0, u_splatRadius, distance);
    field += vec3(u_mouseVel, u_splatDensity) * u_deltaTime * weight;
  }

  gl_FragColor = vec4(field, 1.0);
}
`;

const DIFFUSE_FRAG = `
precision highp float;

uniform vec2 u_textureResolution; // constant
uniform sampler2D u_field;
uniform sampler2D u_field0;
uniform float u_diffusionRate;
uniform float u_deltaTime; // constant
uniform bool u_fieldType; // false: velocity; true: density

varying vec2 v_texCoord;
varying vec2 v_texCoord_l;
varying vec2 v_texCoord_r;
varying vec2 v_texCoord_t;
varying vec2 v_texCoord_b;

void main() {
  vec2 onePixel = 1.0 / u_textureResolution;
  vec2 texCoordi = floor(v_texCoord * u_textureResolution);
  vec3 field = texture2D(u_field, v_texCoord).xyz;
  if (texCoordi.x == 0. || texCoordi.x == u_textureResolution.x - 1. || texCoordi.y == 0. || texCoordi.y == u_textureResolution.y - 1.) {
    gl_FragColor = vec4(field, 1.0);
    return;
  }

  vec3 field0 = texture2D(u_field0, v_texCoord).xyz;

  float a = u_deltaTime * u_diffusionRate;

  if (!u_fieldType) {
    vec2 v_l = texture2D(u_field, v_texCoord_l).xy;
    vec2 v_r = texture2D(u_field, v_texCoord_r).xy;
    vec2 v_t = texture2D(u_field, v_texCoord_t).xy;
    vec2 v_b = texture2D(u_field, v_texCoord_b).xy;

    vec2 v0 = field0.xy;
    vec2 vel = (v0 + a*(v_l + v_r + v_t + v_b)) / (1.0 + 4.0*a);
    gl_FragColor = vec4(vel, field0.z, 1.0);
  } else {
    float d_l = texture2D(u_field, v_texCoord_l).z;
    float d_r = texture2D(u_field, v_texCoord_r).z;
    float d_t = texture2D(u_field, v_texCoord_t).z;
    float d_b = texture2D(u_field, v_texCoord_b).z;

    float d0 = field0.z;
    float d = (d0 + a*(d_l + d_r + d_t + d_b)) / (1.0 + 4.0*a);
    gl_FragColor = vec4(field0.xy, d, 1.0);
  }
}
`;

const COPY_FIELD_FRAG = `
precision highp float;

uniform vec2 u_textureResolution;
uniform sampler2D u_field;

varying vec2 v_texCoord;

void main() {
  gl_FragColor = texture2D(u_field, v_texCoord);
}
`

const ADVECT_FRAG = `
precision highp float;

uniform vec2 u_textureResolution;
uniform sampler2D u_field;
uniform float u_deltaTime;
uniform int u_fieldType;

varying vec2 v_texCoord;

void main() {
  vec2 onePixel = 1.0 / u_textureResolution;
  vec2 texCoordi = floor(v_texCoord * u_textureResolution);
  vec3 field = texture2D(u_field, v_texCoord).xyz;
  if (texCoordi.x == 0. || texCoordi.x == u_textureResolution.x - 1. || texCoordi.y == 0. || texCoordi.y == u_textureResolution.y - 1.) {
    gl_FragColor = vec4(field, 1.0);
    return;
  }

  float dt0 = u_deltaTime * sqrt(u_textureResolution.x * u_textureResolution.y);

  vec2 texCoord = v_texCoord * u_textureResolution;
  vec2 vel = field.xy;
  vec2 pos = texCoord - 0.5 - dt0*vel; // position of 'particle' in previous time step
  vec2 pos0 = floor(pos);
  vec2 pos1 = pos0 + 1.0;
  float s0 = pos1.x - pos.x; 
  float s1 = 1.0 - s0;
  float t0 = pos1.y - pos.y;
  float t1 = 1.0 - t0;

  vec2 coord00 = vec2(pos0.x, pos0.y) * onePixel;
  vec2 coord01 = vec2(pos0.x, pos1.y) * onePixel;
  vec2 coord10 = vec2(pos1.x, pos0.y) * onePixel;
  vec2 coord11 = vec2(pos1.x, pos1.y) * onePixel;

  if (u_fieldType == 0) {
    vec2 v00 = texture2D(u_field, coord00).xy;
    vec2 v01 = texture2D(u_field, coord01).xy; 
    vec2 v10 = texture2D(u_field, coord10).xy; 
    vec2 v11 = texture2D(u_field, coord11).xy; 

    vec2 v = s0*t0*v00 + s0*t1*v01 + s1*t0*v10 + s1*t1*v11;
    gl_FragColor = vec4(v, field.z, 1.0);
  } else {
    float d00 = texture2D(u_field, coord00).z;
    float d01 = texture2D(u_field, coord01).z;
    float d10 = texture2D(u_field, coord10).z;
    float d11 = texture2D(u_field, coord11).z;

    float d = s0*t0*d00 + s0*t1*d01 + s1*t0*d10 + s1*t1*d11;
    gl_FragColor = vec4(field.xy, d, 1.0);
  }
}
`

//
// project
//
const CALC_DIV_FIELD_FRAG = `
precision highp float;

uniform vec2 u_textureResolution; // constant
uniform sampler2D u_field;
uniform float h;

varying vec2 v_texCoord;
varying vec2 v_texCoord_l;
varying vec2 v_texCoord_r;
varying vec2 v_texCoord_t;
varying vec2 v_texCoord_b;

void main() {
  vec2 onePixel = 1.0 / u_textureResolution;
  vec2 texCoordi = floor(v_texCoord * u_textureResolution);
  vec3 field = texture2D(u_field, v_texCoord).xyz;
  if (texCoordi.x == 0. || texCoordi.x == u_textureResolution.x - 1. || texCoordi.y == 0. || texCoordi.y == u_textureResolution.y - 1.) {
    gl_FragColor = vec4(vec3(0.), 1.0);
    return;
  }

  float u_l = texture2D(u_field, v_texCoord_l).x;
  float u_r = texture2D(u_field, v_texCoord_r).x;
  float v_t = texture2D(u_field, v_texCoord_t).y;
  float v_b = texture2D(u_field, v_texCoord_b).y;

  float div = -0.5 * (u_r - u_l + v_b - v_t);
  gl_FragColor = vec4(0., 0., div, 1.0);
}
`

const CALC_GRADIENT_FIELD_FRAG = `
precision highp float;

uniform vec2 u_textureResolution;
uniform sampler2D u_gradientField;
uniform sampler2D u_divField;

varying vec2 v_texCoord;
varying vec2 v_texCoord_l;
varying vec2 v_texCoord_r;
varying vec2 v_texCoord_t;
varying vec2 v_texCoord_b;

void main() {
  vec2 onePixel = 1.0 / u_textureResolution;
  vec2 texCoordi = floor(v_texCoord * u_textureResolution);
  float p = texture2D(u_gradientField, v_texCoord).z;
  if (texCoordi.x == 0. || texCoordi.x == u_textureResolution.x - 1. || texCoordi.y == 0. || texCoordi.y == u_textureResolution.y - 1.) {
    gl_FragColor = vec4(0., 0., p, 1.0);
    return;
  }

  float div = texture2D(u_divField, v_texCoord).z;
  float p_l = texture2D(u_gradientField, v_texCoord_l).z;
  float p_r = texture2D(u_gradientField, v_texCoord_r).z;
  float p_t = texture2D(u_gradientField, v_texCoord_t).z;
  float p_b = texture2D(u_gradientField, v_texCoord_b).z;

  p = (div + p_l + p_r + p_t + p_b) / 4.01;
  gl_FragColor = vec4(0., 0., p, 1.0);
}
`

const CALC_MASS_CONSERVING_FIELD_FRAG = `
precision highp float;

uniform vec2 u_textureResolution;
uniform sampler2D u_field;
uniform sampler2D u_gradientField;

varying vec2 v_texCoord;
varying vec2 v_texCoord_l;
varying vec2 v_texCoord_r;
varying vec2 v_texCoord_t;
varying vec2 v_texCoord_b;

void main() {
  vec2 onePixel = 1.0 / u_textureResolution;
  vec2 texCoordi = floor(v_texCoord * u_textureResolution);
  vec3 field = texture2D(u_field, v_texCoord).xyz;
  if (texCoordi.x == 0. || texCoordi.x == u_textureResolution.x - 1. || texCoordi.y == 0. || texCoordi.y == u_textureResolution.y - 1.) {
    gl_FragColor = vec4(field, 1.0);
    return;
  }

  float p_l = texture2D(u_gradientField, v_texCoord_l).z;
  float p_r = texture2D(u_gradientField, v_texCoord_r).z;
  float p_t = texture2D(u_gradientField, v_texCoord_t).z;
  float p_b = texture2D(u_gradientField, v_texCoord_b).z;

  vec2 vel = field.xy;
  vel.x -= 0.5 * (p_r - p_l);
  vel.y -= 0.5 * (p_b - p_t);

  gl_FragColor = vec4(vel, field.z, 1.0);
}
`

const SET_BOUNDARIES_FRAG = `
precision highp float;

uniform vec2 u_textureResolution;
uniform sampler2D u_boundaries;
uniform sampler2D u_field;
uniform int u_boundaryType;
uniform float u_boundaryFriction;

varying vec2 v_texCoord;
varying vec2 v_texCoord_l;
varying vec2 v_texCoord_r;
varying vec2 v_texCoord_t;
varying vec2 v_texCoord_b;

const int size = 9;

void main() {
  vec2 onePixel = 1.0 / u_textureResolution;

  float b   = texture2D(u_boundaries, v_texCoord).a; // opacity 0 - 1
  float b_l = texture2D(u_boundaries, v_texCoord_l).a;
  float b_r = texture2D(u_boundaries, v_texCoord_r).a;
  float b_t = texture2D(u_boundaries, v_texCoord_t).a;
  float b_b = texture2D(u_boundaries, v_texCoord_b).a;

  vec3 field = texture2D(u_field, v_texCoord).xyz;

  if (b == 0.0) {
    gl_FragColor = vec4(field, 1.);
    return;
  }

  if (u_boundaryType == 0) { // velocity; zero xy
    vec2 avgVel;
    float b[size];
    float x = -1.0;
    float y = -1.0;
    for (int i = 0; i < 9; i++) {
      vec2 coord = v_texCoord + vec2(x, y) * onePixel;
      b[i] = texture2D(u_boundaries, coord).a;
      avgVel += texture2D(u_field, coord).xy * (1.0 - b[i]);
      x = x == 1.0 ? -1.0 : x + 1.0;
      if (x == -1.0) {
        y += 1.0;
      }
    }
    avgVel = avgVel / 9.0;

    vec2 normal;
    normal += normalize(vec2(1.0, -1.0)) * (b[6] - b[2]);
    normal += normalize(vec2(1.0, 0.0)) * (b[3] - b[5]);
    normal += normalize(vec2(1.0, 1.0)) * (b[0] - b[8]);
    normal += normalize(vec2(0.0, 1.0)) * (b[1] - b[7]);

    vec2 tangent = cross(vec3(normal, 0), vec3(0.0, 0.0, -1.0)).xy;
    tangent = normalize(tangent + 0.0000000000000001);
    vec2 v = dot(avgVel, tangent) * tangent;
    gl_FragColor = vec4(v, field.z, 1.0);
  } else if (u_boundaryType == 1) { // density, div, gradient; continuous z
    float x_l = texture2D(u_field, v_texCoord_l).z;
    float x_r = texture2D(u_field, v_texCoord_r).z;
    float x_t = texture2D(u_field, v_texCoord_t).z;
    float x_b = texture2D(u_field, v_texCoord_b).z;

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
    gl_FragColor = vec4(field.xy, x, 1.);
  }
}
`

const DISPLAY_FRAG = `
#define CLAMP(x) atan(x) / 3.14159265359 + 0.5
precision highp float;

uniform sampler2D u_field;
uniform sampler2D u_prevField;
uniform sampler2D u_boundaries;

varying vec2 v_texCoord;

vec4 hsla2rgba(vec4 hsla) {
  float h6 = hsla.x * 6.0;
  vec3 rgb;
  rgb.r = 1.0 - smoothstep(1., 2., h6) + smoothstep(4., 5., h6);
  rgb.g = smoothstep(0., 1., h6) - smoothstep(3., 4., h6);
  rgb.b = smoothstep(2., 3., h6) - smoothstep(5., 6., h6);

  rgb += (1.0 - rgb) * (1.0 - hsla.y);
  rgb *= hsla.z;

  return vec4(rgb, hsla.a);
}

void main() {
  vec3 field = texture2D(u_field, v_texCoord).xyz;
  vec3 field0 = texture2D(u_prevField, v_texCoord).xyz;

  float b = texture2D(u_boundaries, v_texCoord).a;

  float vel0 = length(field0.xy);
  float vel = length(field.xy);
  float acc = vel - vel0;
  
  float d0 = field0.z;
  float d = field.z;
  float dddt = d - d0;

  float p = d * acc; 

  vec4 hsla;
  hsla.x = p * 50.0;
  hsla.y = CLAMP(acc * 10.0) * 2.0 - 1.0;
  hsla.z = 1.0;
  hsla.a = 1.0;
  // gl_FragColor = hsla2rgba(hsla) * vec4(vec3(1.0 - b), 1.0);
  gl_FragColor = vec4(CLAMP(field) * (1.0 - b), 1.0);
}
`;