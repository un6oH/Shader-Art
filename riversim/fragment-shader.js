const DRAW_TEXTURE_FS = 
`#version 300 es
precision highp float;

in vec2 texCoord;

uniform sampler2D source;
uniform vec2 canvasDimensions;
uniform float scale;

out vec4 colour;

void main() {
  vec4 value = texture(source, texCoord);
  if (value == vec4(0) || isnan(value) != bvec4(false) || isinf(value) != bvec4(false)) {
    colour = vec4(1, 0, 1, 1);
    return;
  } else {
    colour = vec4(value.rgb / scale, 1);
  }
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
uniform float sourceHeight;
uniform float inputRate;
uniform float deltaTime;

out float height;

void main() {
  ivec2 texCoord = ivec2(v_texCoord);

  float h = texelFetch(heightTexture, texCoord, 0).x;
  float b = texelFetch(groundHeightTexture, texCoord, 0).x;
  bool isSource = texelFetch(sourceTexture, texCoord, 0).x != 0.0;

  float d = h - b;

  if (!isSource || sourceHeight < h || sourceHeight < b) {
    height = h;
    return;
  }

  height = min(h + inputRate * deltaTime, sourceHeight);
}
`;

const REMOVE_SINKS_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D heightTexture;
uniform sampler2D groundHeightTexture;
uniform sampler2D sinkTexture;
uniform float sinkHeight;
uniform float outputRate;
uniform float deltaTime;

out float height;

void main() { 
  ivec2 texCoord = ivec2(v_texCoord);

  float h = texelFetch(heightTexture, texCoord, 0).x;
  float b = texelFetch(groundHeightTexture, texCoord, 0).x;
  bool isSink = texelFetch(sinkTexture, texCoord, 0).x != 0.0;

  float d = h - b;

  if (!isSink || sinkHeight > h || sinkHeight < b) {
    height = h;
    return;
  }

  height = max(h - outputRate * deltaTime, max(sinkHeight, b));
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
  float d = texelFetch(heightTexture, texCoord, 0).x - texelFetch(groundHeightTexture, texCoord, 0).x;
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
uniform float distance;
uniform vec2 textureDimensions;

out float alpha; // alphaTexture

void main() {
  // ivec2 texCoord = ivec2(v_texCoord);
  vec2 onePixel = 1.0 / textureDimensions;
  vec2 texCoord = v_texCoord * onePixel;

  // float dc = texelFetchOffset(depthTexture, texCoord, 0, ivec2(0, 0)).x;
  // float dl = texelFetchOffset(depthTexture, texCoord, 0, ivec2(-1, 0)).x;
  // float dr = texelFetchOffset(depthTexture, texCoord, 0, ivec2( 1, 0)).x;
  // float dt = texelFetchOffset(depthTexture, texCoord, 0, ivec2(0, -1)).x;
  // float db = texelFetchOffset(depthTexture, texCoord, 0, ivec2(0,  1)).x;
  float dc = texture(depthTexture, texCoord + vec2(0, 0) * onePixel).x;
  float dl = texture(depthTexture, texCoord + vec2(-1, 0) * onePixel).x;
  float dr = texture(depthTexture, texCoord + vec2( 1, 0) * onePixel).x;
  float dt = texture(depthTexture, texCoord + vec2(0, -1) * onePixel).x;
  float db = texture(depthTexture, texCoord + vec2(0,  1) * onePixel).x;

  float alphainv = 1.0 + grav * pow(deltaTime / distance, 2.0) * 0.25 * (4.0*dc + dl + dr + dt + db);
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

  height = alpha * (beta + gamma*(hl*sum0.x + hr*sum1.x + ht*sum0.y + hb*sum1.y));
}
`;

const UPDATE_HEIGHT_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D newHeightTexture;
uniform sampler2D heightTexture;

layout(location = 0) out float height;
layout(location = 1) out float heightn1;

void main() {
  ivec2 texCoord = ivec2(v_texCoord);
  height = texelFetch(newHeightTexture, texCoord, 0).x;
  heightn1 = texelFetch(heightTexture, texCoord, 0).x;
}
`;

const UPDATE_VELOCITY_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D heightTexture;
uniform sampler2D velocityTexture;
uniform float grav;
uniform float distance;

out vec2 newVel;

void main() {
  ivec2 texCoord = ivec2(v_texCoord);

  float hc = texelFetch(heightTexture, texCoord, 0).x;
  float hr = texelFetchOffset(heightTexture, texCoord, 0, ivec2(1, 0)).x;
  float hb = texelFetchOffset(heightTexture, texCoord, 0, ivec2(0, 1)).x;

  vec2 acc = -grav / distance * vec2(hr - hc, hb - hc);

  vec2 vel = texelFetch(velocityTexture, texCoord, 0).xy;
  newVel = vel + acc;
}
`;

const RENDER_FS = 
`#version 300 es
precision highp float;

in vec2 texCoord;

uniform sampler2D heightTexture;
uniform sampler2D groundHeightTexture;
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
  float h = texture(heightTexture, texCoord).x;
  float b = texture(groundHeightTexture, texCoord).x;
  float d = h - b;

  // colour = rgba(vec4(2.0 / 3.0, d / scale, b / scale, 1));
  
}
`;