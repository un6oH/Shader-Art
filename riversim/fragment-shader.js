const DRAW_TEXTURE_FS = 
`#version 300 es
precision highp float;

in vec2 texCoord;

uniform sampler2D source;

out vec4 colour;

void main() {
  vec4 value = texture(source, texCoord);
  colour = value;
}
`

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
`

const ADD_SOURCES_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D heightTexture;
uniform sampler2D heightn1Texture;
uniform sampler2D groundHeightTexture;
uniform sampler2D sourceTexture;
uniform float sourceHeight;
uniform float inputRate;
uniform float deltaTime;

layout(location = 0) out float height;
layout(location = 1) out float heightn1;

void main() {
  ivec2 texCoord = ivec2(v_texCoord);

  float h = texelFetch(heightTexture, texCoord, 0).x;
  float hn1 = texelFetch(heightn1Texture, texCoord, 0).x;
  float b = texelFetch(groundHeightTexture, texCoord, 0).x;
  bool isSource = texelFetch(sourceTexture, texCoord, 0).x != 0.0;

  float d = h - b;

  if (!isSource || sourceHeight < h || sourceHeight < b) {
    height = h;
    heightn1 = hn1;
    return;
  }

  height = min(h + inputRate * deltaTime, sourceHeight);
  heightn1 = min(hn1 + inputRate * deltaTime, sourceHeight);
}
`

const REMOVE_SINKS_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D heightTexture;
uniform sampler2D heightn1Texture;
uniform sampler2D groundHeightTexture;
uniform sampler2D sinkTexture;
uniform float sinkHeight;
uniform float outputRate;
uniform float deltaTime;

layout(location = 0) out float height;
layout(location = 1) out float heightn1;

void main() { 
  ivec2 texCoord = ivec2(v_texCoord);

  float h = texelFetch(heightTexture, texCoord, 0).x;
  float hn1 = texelFetch(heightTexturen1, texCoord, 0).x;
  float b = texelFetch(groundHeightTexture, texCoord, 0).x;
  bool isSink = texelFetch(sinkTexture, texCoord, 0).x != 0.0;

  float d = h - b;

  if (!isSink || sinkHeight > h || sinkHeight < b) {
    height = h;
    heightn1 = hn1;
    return;
  }

  height = max(h - outputRate * deltaTime, max(sinkHeight, b));
  heightn1 = max(hn1 - outputRate * deltaTime, max(sinkHeight, b));
}
`

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
`

const SET_ALPHA_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D depthTexture; // R32F texture
uniform float grav; // gravity
uniform float deltaTime;
uniform float distance;

out float alpha; // alphaTexture

void main() {
  ivec2 texCoord = ivec2(v_texCoord);
  float dc = texelFetchOffset(depthTexture, texCoord, 0, ivec2(0, 0)).x;
  float dl = texelFetchOffset(depthTexture, texCoord, 0, ivec2(-1, 0)).x;
  float dr = texelFetchOffset(depthTexture, texCoord, 0, ivec2( 1, 0)).x;
  float dt = texelFetchOffset(depthTexture, texCoord, 0, ivec2(0, -1)).x;
  float db = texelFetchOffset(depthTexture, texCoord, 0, ivec2(0,  1)).x;

  alpha = 1.0 / (1.0 + grav*deltaTime*deltaTime*(4.0*dc + dl + dr + dt + db)*0.25 / (distance * distance));
}
`

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
`

const SET_DEPTH_SUM_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D depthTexture;

out vec2 sum;

void main() {
  ivec2 texCoord = ivec2(v_texCoord);
  
  float dc = texelFetch(depthTexture, texCoord, 0).x;
  float dr = texelFetchOffset(depthTexture, texCoord, 0, ivec2(1, 0)).x;
  float db = texelFetchOffset(depthTexture, texCoord, 0, ivec2(0, 1)).x;

  sum = vec2(dc + dr, dc + db);
}
`

const SOLVE_HEIGHT_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D alphaTexture; // TEXTURE0
uniform sampler2D betaTexture; // TEXTURE1
uniform sampler2D heightTexture; // TEXTURE2
uniform sampler2D depthSumTexture; // TEXTURE3
uniform float gamma;

out float height;

void main() {
  ivec2 texCoord = ivec2(v_texCoord);

  float alpha = texelFetch(alphaTexture, texCoord, 0).x;
  float beta = texelFetch(betaTexture, texCoord, 0).x;

  float hc = texelFetchOffset(heightTexture, texCoord, 0, ivec2(0, 0)).x;
  float hl = texelFetchOffset(heightTexture, texCoord, 0, ivec2(-1, 0)).x;
  float hr = texelFetchOffset(heightTexture, texCoord, 0, ivec2( 1, 0)).x;
  float ht = texelFetchOffset(heightTexture, texCoord, 0, ivec2(0, -1)).x;
  float hb = texelFetchOffset(heightTexture, texCoord, 0, ivec2(0,  1)).x; 

  vec2 sum0 = vec2(
    texelFetchOffset(depthSumTexture, texCoord, 0, ivec2(-1, 0)).x, 
    texelFetchOffset(depthSumTexture, texCoord, 0, ivec2(0, -1)).y);
  vec2 sum1 = texelFetch(depthSumTexture, texCoord, 0).xy;

  height = alpha * (beta + gamma*(hl*sum0.x + hr*sum1.x + ht*sum0.y + hb*sum1.y));
}
`

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
`

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
`

const RENDER_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D heightTexture;
uniform sampler2D groundHeightTexture;

out vec4 colour;

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
  ivec2 texCoord = ivec2(v_texCoord);

  float h = texelFetch(heightTexture, texCoord, 0).x;
  float b = texelFetch(groundHeightTexture, texCoord, 0).x;
  float d = h - b;

  colour = hsla2rgba(vec4(0.666666666667, d, b, 1));
}
`