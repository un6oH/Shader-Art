const DRAW_TEXTURE_FS = 
`#version 300 es
precision highp float;

in vec2 texCoord;

uniform sampler2D source;
uniform vec2 canvasDimensions;
uniform float scale;
uniform bool normalise;

out vec4 colour;

void main() {
  vec4 value = texture(source, texCoord);
  colour = normalise ? vec4((value.rgb / scale + 1.0) * 0.5, 1) : vec4(value.rgb / scale, 1);
  // if (normalise) {
  //   colour = vec4(vec3(sign(value.x) * 0.5 + 0.5), 1.0);
  // } else {
  //   colour = vec4(vec3(value.x <= 0.0 ? 0.0 : 1.0), 1.0);
  // }
}
`;

const SET_GROUND_HEIGHT_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D groundHeightTexture;
uniform float scale;

out float height;

void main() {
  ivec2 texCoord = ivec2(v_texCoord);
  height = scale * texelFetch(groundHeightTexture, texCoord, 0).x;
}
`;

const ADD_SOURCES_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D heightTexture;
uniform sampler2D groundHeightTexture;
uniform sampler2D sourceTexture;
uniform sampler2D depthTexture;
uniform float sourceHeight;
uniform float inputRate;
uniform float deltaTime;

out float height;

void main() {
  ivec2 texCoord = ivec2(v_texCoord);

  float h = texelFetch(heightTexture, texCoord, 0).x;
  float b = texelFetch(groundHeightTexture, texCoord, 0).x;
  bool isSource = texelFetch(sourceTexture, texCoord, 0).x != 0.0;
  float d = texelFetch(depthTexture, texCoord, 0).x;

  if (!isSource || sourceHeight < h || sourceHeight < b) {
    height = h;
    return;
  }

  height = b + d + inputRate * deltaTime;
}
`;

const REMOVE_SINKS_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D heightTexture;
uniform sampler2D groundHeightTexture;
uniform sampler2D sinkTexture;
uniform sampler2D depthTexture;
uniform float sinkHeight;
uniform float outputRate;
uniform float deltaTime;

out float height;

void main() { 
  ivec2 texCoord = ivec2(v_texCoord);

  float h = texelFetch(heightTexture, texCoord, 0).x;
  float b = texelFetch(groundHeightTexture, texCoord, 0).x;
  bool isSink = texelFetch(sinkTexture, texCoord, 0).x != 0.0;
  float d = texelFetch(depthTexture, texCoord, 0).x;

  if (!isSource || sinkHeight > h || sourceHeight < b) {
    height = h;
    return;
  }

  height = b + d - outputRate * deltaTime;
}
`;

const SET_DEPTH_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord; // pixel coordinates

uniform sampler2D heightTexture; // TEXTURE0
uniform sampler2D groundHeightTexture; // TEXTURE1

out float depth;

void main() {
  ivec2 texCoord = ivec2(v_texCoord);
  float h = texelFetch(heightTexture, texCoord, 0).x;
  float b = texelFetch(groundHeightTexture, texCoord, 0).x;
  float d = h - b;
  depth = max(d, 0.0);
}
`;

const SET_ALPHA_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D depthTexture; // R32F texture
uniform float grav; // gravity
uniform float deltaTime;
uniform float unit;
uniform vec2 textureDimensions;

out float alpha; // alphaTexture

void main() {
  // ivec2 texCoord = ivec2(v_texCoord);
  vec2 onePixel = 1.0 / textureDimensions;
  vec2 texCoord = v_texCoord * onePixel;

  float dc = texture(depthTexture, texCoord).x;
  float dl = 0.0;
  float dr = 0.0;
  float dt = 0.0;
  float db = 0.0;

  float n = 0.0;
  if (texCoord.x > onePixel.x) {
    dl = texture(depthTexture, texCoord + vec2(-1, 0) * onePixel).x;
    n += 1.0;
  } 
  if (texCoord.x < textureDimensions.x - onePixel.x) {
    dr = texture(depthTexture, texCoord + vec2( 1, 0) * onePixel).x;
    n += 1.0;
  }

  if (texCoord.y > onePixel.y) {
    dt = texture(depthTexture, texCoord + vec2(0, -1) * onePixel).x;
    n += 1.0;
  }
  if (texCoord.y < textureDimensions.y - onePixel.y) {
    db = texture(depthTexture, texCoord + vec2(0,  1) * onePixel).x;
    n += 1.0;
  }

  float alphainv = 1.0 + grav * pow(deltaTime / unit, 2.0) * 0.25 * (n*dc + dl + dr + dt + db);
  alpha = 1.0 / alphainv;
}
`;

const SET_BETA_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D heightn1Texture; // TEXTURE0
uniform sampler2D heightn2Texture; // TEXTURE1
uniform float damping;

out float beta;

void main() {
  ivec2 texCoord = ivec2(v_texCoord);

  float hn1 = texelFetch(heightn1Texture, texCoord, 0).x;
  float hn2 = texelFetch(heightn2Texture, texCoord, 0).x;

  beta = hn1 + (1.0 - damping)*(hn1 - hn2);
}
`;

const SET_DEPTH_SUM_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D depthTexture;
uniform vec2 textureDimensions;

out vec2 sum;

void main() {
  // ivec2 texCoord = ivec2(v_texCoord);
  vec2 onePixel = 1.0 / textureDimensions;
  vec2 texCoord = v_texCoord * onePixel;
  
  // float dc = texelFetch(depthTexture, texCoord, 0).x;
  // float dr = texelFetchOffset(depthTexture, texCoord, 0, ivec2(1, 0)).x;
  // float db = texelFetchOffset(depthTexture, texCoord, 0, ivec2(0, 1)).x;
  float dc = texture(depthTexture, texCoord).x;
  float dr = texture(depthTexture, texCoord + vec2(1, 0) * onePixel).x;
  float db = texture(depthTexture, texCoord + vec2(0, 1) * onePixel).x;

  sum = vec2(dc + dr, dc + db);
}
`;

const SOLVE_HEIGHT_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D alphaTexture; // TEXTURE0
uniform sampler2D betaTexture; // TEXTURE1
uniform sampler2D heightTexture; // TEXTURE2
uniform sampler2D depthSumTexture; // TEXTURE3
uniform float gamma;
uniform vec2 textureDimensions;

out float height;

void main() {
  // ivec2 texCoord = ivec2(v_texCoord);
  vec2 onePixel = 1.0 / textureDimensions;
  vec2 texCoord = v_texCoord * onePixel;

  // float alpha = texelFetch(alphaTexture, texCoord, 0).x;
  // float beta =  texelFetch(betaTexture, texCoord, 0).x;
  float alpha = texture(alphaTexture, texCoord).x;
  float beta =  texture(betaTexture, texCoord).x;

  // float hc = texelFetchOffset(heightTexture, texCoord, 0, ivec2(0, 0)).x;
  // float hl = texelFetchOffset(heightTexture, texCoord, 0, ivec2(-1, 0)).x;
  // float hr = texelFetchOffset(heightTexture, texCoord, 0, ivec2( 1, 0)).x;
  // float ht = texelFetchOffset(heightTexture, texCoord, 0, ivec2(0, -1)).x;
  // float hb = texelFetchOffset(heightTexture, texCoord, 0, ivec2(0,  1)).x; 
  float hc = texture(heightTexture, texCoord + vec2(0, 0) * onePixel).x;
  float hl = texture(heightTexture, texCoord + vec2(-1, 0) * onePixel).x;
  float hr = texture(heightTexture, texCoord + vec2( 1, 0) * onePixel).x;
  float ht = texture(heightTexture, texCoord + vec2(0, -1) * onePixel).x;
  float hb = texture(heightTexture, texCoord + vec2(0,  1) * onePixel).x; 

  // vec2 sum0 = vec2(
  //   texelFetchOffset(depthSumTexture, texCoord, 0, ivec2(-1, 0)).x, 
  //   texelFetchOffset(depthSumTexture, texCoord, 0, ivec2(0, -1)).y);
  // vec2 sum1 = texelFetch(depthSumTexture, texCoord, 0).xy;
  vec2 sum0 = vec2(
    texture(depthSumTexture, texCoord + vec2(-1, 0) * onePixel).x, 
    texture(depthSumTexture, texCoord + vec2(0, -1) * onePixel).y);
  vec2 sum1 = texture(depthSumTexture, texCoord).xy;

  if (texCoord.x < onePixel.x) {
    sum0.x = 0.0;
  } 
  if (texCoord.x > textureDimensions.x - onePixel.x) {
    sum1.x = 0.0;
  }

  if (texCoord.y < onePixel.y) {
    sum0.y = 0.0;
  }
  if (texCoord.y > textureDimensions.y - onePixel.y) {
    sum1.y = 0.0;
  }

  height = alpha * (beta + gamma*(hl*sum0.x + hr*sum1.x + ht*sum0.y + hb*sum1.y));
}
`;

const SET_EXCESS_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;
in float v_excess;

uniform vec2 textureDimensions;
uniform sampler2D excessTexture;

out float excess;

void main() {
  vec2 texCoord = v_texCoord / textureDimensions;
  float e = texture(excessTexture, texCoord).x;
  excess = e + v_excess;
}
`;

const PROPAGATE_EXCESS_VOLUME_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform vec2 textureDimensions;
uniform sampler2D excessTexture;

out float excess;

void main() {
  vec2 onePixel = vec2(1) / textureDimensions;
  vec2 texCoord = v_texCoord * onePixel;

  float e = texture(excessTexture, texCoord).x;
  if (e == 0.0) {
    excess = 0.0;
    return;
  }

  float e_l = texture(excessTexture, texCoord + onePixel * vec2(-1, 0)).x;
  float e_r = texture(excessTexture, texCoord + onePixel * vec2(1, 0)).x;
  float e_t = texture(excessTexture, texCoord + onePixel * vec2(0, -1)).x;
  float e_b = texture(excessTexture, texCoord + onePixel * vec2(0, 1)).x;

  float total = e + e_l + e_r + e_t + e_b;
  float n = 1.0 + (e_l != 0.0 ? 1.0 : 0.0)+ (e_r != 0.0 ? 1.0 : 0.0)+ (e_t != 0.0 ? 1.0 : 0.0)+ (e_b != 0.0 ? 1.0 : 0.0);
  excess = total / n;
}
`

const CORRECT_VOLUME_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform vec2 textureDimensions;
uniform sampler2D heightTexture;
uniform sampler2D excessTexture;

out float height;

void main() {
  vec2 texCoord = v_texCoord / textureDimensions;
  float h = texture(heightTexture, texCoord).x;
  float e = texture(excessTexture, texCoord).x;
  height = max(h - e, 0.0);
}
`;

const SET_BOUNDARIES_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform vec2 textureDimensions;
uniform sampler2D heightTexture;
uniform sampler2D groundHeightTexture;
uniform float epsilon;

out float height;

void main() {
  vec2 texCoord = v_texCoord / textureDimensions;
  float h = texture(heightTexture, texCoord).x;
  float b = texture(groundHeightTexture, texCoord).x;
  
  if (h >= b) {
    height = h;
    return;
  }

  height = max(b - epsilon, 0.0);
}
`;






const UPDATE_VELOCITY_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D heightTexture;
uniform sampler2D velocityTexture;
uniform float grav;
uniform float unit;
uniform float deltaTime;

out vec2 newVel;

void main() {
  ivec2 texCoord = ivec2(v_texCoord);

  float hc = texelFetch(heightTexture, texCoord, 0).x;
  float hr = texelFetchOffset(heightTexture, texCoord, 0, ivec2(1, 0)).x;
  float hb = texelFetchOffset(heightTexture, texCoord, 0, ivec2(0, 1)).x;

  vec2 acc = -grav / unit * vec2(hr - hc, hb - hc);
  vec2 vel = texelFetch(velocityTexture, texCoord, 0).xy;
  newVel = vel + acc * deltaTime;
}
`;

const RENDER_FS = 
`#version 300 es
precision highp float;

in vec2 texCoord;

uniform sampler2D depthTexture;
uniform sampler2D groundHeightTexture;
uniform sampler2D normalMapTexture;
uniform float scale;

out vec4 colour;

vec4 rgba(vec4 hsla) {
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
  float d = texture(depthTexture, texCoord).x;
  float b = texture(groundHeightTexture, texCoord).x;

  // vec4 base = vec4(100.0 / 255, 150.0 / 255.0, 90.0 / 255.0, 1);
  // vec4 water = vec4
  vec3 normal = texture(normalMapTexture, texCoord).xyz;
  float light = dot(normal, vec3(-1, -1, -1)) - 0.5;
  colour = rgba(vec4(2.0 / 3.0, d / scale, light, 1));
}
`;

const SET_NORMAL_MAP_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform vec2 textureDimensions;
uniform sampler2D groundHeightTexture;
uniform float unit;

out vec4 normal;

void main() {
  vec2 onePixel = 1.0 / textureDimensions;
  vec2 texCoord = v_texCoord * onePixel;

  float hl = texture(groundHeightTexture, texCoord - onePixel * vec2(-1, 0)).x * unit;
  float hr = texture(groundHeightTexture, texCoord - onePixel * vec2( 1, 0)).x * unit;
  float ht = texture(groundHeightTexture, texCoord - onePixel * vec2(0, -1)).x * unit;
  float hb = texture(groundHeightTexture, texCoord - onePixel * vec2(0,  1)).x * unit;

  vec2 position = v_texCoord * unit;
  vec3 u = vec3(2.0 * unit, 0, hr - hl);
  vec3 v = vec3(0, 2.0 * unit, hb - ht);
  normal = vec4(normalize(cross(v, u)), 1);
}
`

const BLANK_FS = 
`#version 300 es

void main() {

}
`;

const ROTATE_TEXTURE_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D image;

out vec4 colour;

void main() {
  colour = texture(image, v_texCoord);
}
`;

