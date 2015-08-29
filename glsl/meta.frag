
precision mediump float;

uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;
uniform vec4 mgrl_clear_color;
uniform mat4 light_projection_matrix;
uniform mat4 light_view_matrix;

uniform float alpha;
uniform bool is_sprite;
uniform bool is_transparent;

varying vec3 world_position;
varying vec2 local_tcoords;
varying float linear_depth;

uniform sampler2D mask_texture;
uniform sampler2D fg_texture;
uniform sampler2D bg_texture;
uniform sampler2D depth_texture;
uniform sampler2D diffuse_texture;

uniform vec3 color;

uniform bool depth_pass;
uniform bool diffuse_pass;
uniform bool bitmask_pass;
uniform bool collision_pass;
uniform bool illumination_pass;

#include "normalize_screen_coord.glsl"


float illumination () {
  // transform the world coordinate into the light's view space
  vec3 position = (light_view_matrix * vec4(world_position, 1.0)).xyz;
  // apply the light's projection matrix
  vec4 light_projected = light_projection_matrix * vec4(position, 1.0);
  
  // determine the vector from the light source to the fragment
  vec2 light_normal = light_projected.xy/light_projected.w;
  vec2 light_uv = light_normal*0.5+0.5;

  if (light_uv.x < 0.0 || light_uv.y < 0.0 || light_uv.x > 1.0 || light_uv.y > 1.0) {
    return 0.0;
  }

  float bias = 0.001;
  float light_depth_1 = texture2D(depth_texture, light_uv).r;
  float light_depth_2 = length(position);
  float illuminated = step(light_depth_2, light_depth_1 + bias);
  //float illuminated = step(light_depth_1, light_depth_2 + bias);

  return illuminated;
}


void main(void) {
  if (depth_pass) {
    gl_FragColor = vec4(linear_depth, linear_depth, linear_depth, 1.0);
  }
  else if (bitmask_pass) {
    vec2 tcoords = normalize_screen_coord(gl_FragCoord.xy);
    float mask = texture2D(mask_texture, tcoords).r;
    vec4 sampled = mask < 0.5 ? texture2D(bg_texture, tcoords) : texture2D(fg_texture, tcoords);
    gl_FragColor = sampled;
  }
  else if (illumination_pass) {
    float lit = illumination();
    gl_FragColor = vec4(lit, lit, lit, 1.0);

  }
  else if (collision_pass) {
    float lit = illumination();
    if (lit < 0.5) {
      if (color == vec3(1.0, 1.0, 1.0)) {
        gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
      }
      else {
        gl_FragColor = mgrl_clear_color;
      }
    }
    else {
      gl_FragColor = vec4(color, 1.0);
    }
  }
  else if (diffuse_pass) {
    vec4 diffuse = texture2D(diffuse_texture, local_tcoords);
    if (is_sprite) {
      float cutoff = is_transparent ? 0.1 : 1.0;
      if (diffuse.a < cutoff) {
        discard;
      }
    }
    diffuse.a *= alpha;
    gl_FragColor = diffuse;
  }
}
