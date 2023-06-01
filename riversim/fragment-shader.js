const DRAW_TEXTURE_FS = 
`#version 300 es
precision highp float;

in vec2 texCoord;

uniform sampler2D texture;

out vec4 colour;

void main() {
  colour = texture(texture, texCoord);
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
  height = scale * texelFetch(groundHeightTexture, texCoord).x;
}
`

const ADD_SOURCES_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D heightTexture;
uniform sampler2D sourceTexture;
uniform sampler2D sinkTexture;
uniform float sourceHeight;
uniform float sinkHeight;
uniform float inputRate;
uniform float outputRate;
uniform float deltaTime;

out float height;

void main() {
  ivec2 texCoord = ivec2(v_texCoord);

  float h = texelFetch(heightTexture, texCoord);
  bool input = texelFetch(sourceTexture, texCoord).x != 0;
  bool output = texelFetch(sinkTexture, texCoord).x != 0;

  if (input == output) {
    height = h;
    return;
  }
  if (input) {
    height = min(h + inputRate * deltaTime, sourceHeight);
  } else {
    height = max(h - outputRate * deltaTime, sinkHeight);
  }
}
`

const SET_DEPTH_FIELD_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord; // pixel coordinates

uniform sampler2D heightTexture; // TEXTURE0
uniform sampler2D groundHeightTexture; // TEXTURE1

out float depth;

void main() {
  ivec2 texCoord = ivec2(v_texCoord);
  depth = texelFetch(heightTexture, texCoord).x - texelFetch(groundHeightTexture, texCoord).x;
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

  alpha = 1 / (1 + grav*deltaTime*deltaTime*(4*dc + dl + dr + dt + db)*0.25 / (distance * distance));
}
`

const SET_BETA_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D heightTexturen1; // TEXTURE0
uniform sampler2D heightTexturen2; // TEXTURE1
uniform float damping;

out float beta;

void main() {
  ivec2 texCoord = ivec2(v_texCoord);

  float hn1 = texelFetch(heightTexturen1, texCoord).x;
  float hn2 = texelFetch(heightTexturen2, texCoord).x;

  beta = hn1 + (1 - damping)*(hn1 - hn2);
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
  
  float dc = texelFetch(depthTexture, texCoord).x;
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

  float alpha = texelFetch(alphaTexture, texCoord).x;
  float beta = texelFetch(betaTexture, texCoord).x;

  float hc = texelFetchOffset(heightTexture, texCoord, 0, ivec2(0, 0)).x;
  float hl = texelFetchOffset(heightTexture, texCoord, 0, ivec2(-1, 0)).x;
  float hr = texelFetchOffset(heightTexture, texCoord, 0, ivec2( 1, 0)).x;
  float ht = texelFetchOffset(heightTexture, texCoord, 0, ivec2(0, -1)).x;
  float hb = texelFetchOffset(heightTexture, texCoord, 0, ivec2(0,  1)).x; 

  float sum0 = vec2(
    texelFetchOffset(depthSumTexture, texCoord, 0, ivec2(-1, 0)).x, 
    texelFetchOffset(depthSumTexture, texCoord, 0, ivec2(0, -1)).y);
  float sum1 = texelFetch(depthSumTexture, texCoord).xy;

  height = a * (beta + gamma*(hl*sum0.x + hr*sum1.x + ht*sum0.y + hb*sum1.y));
}
`

const SET_HEIGHT_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D heightTexture;

out float height;

void main() {
  ivec2 texCoord = ivec2(v_texCoord);
  height = texture(heightTexture, texCoord).x;
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

  float hc = texelFetch(heightTexture, texCoord).x;
  float hr = texelFetchOffset(heightTexture, texCoord, 0, ivec2(1, 0)).x;
  float hb = texelFetchOffset(heightTexture, texCoord, 0, ivec2(0, 1)).x;

  vec2 acc = -grav / distance * vec2(hr - hc, hb - hc);

  vec2 vel = texelFetch(velocityTexture, texCoord).xy;
  newVel = vel + acc;
}
`