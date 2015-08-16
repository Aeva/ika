precision mediump float;

uniform float mgrl_frame_start;
uniform vec4 mgrl_clear_color;
varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoords;
varying vec3 world_position;
varying vec3 world_normal;
varying vec3 view_position;

uniform vec3 color;

void main(void) {
  float fog_factor = clamp(world_position.z*0.5, 0.0, 1.0);
  vec3 fog_color = mgrl_clear_color.rgb;
  vec3 combined = mix(fog_color, color, fog_factor);
  gl_FragColor = vec4(combined, 1.0);
}
