
precision mediump float;

void main(void) {
  float depth = gl_FragCoord.z;
  gl_FragColor = vec4(depth, depth, depth, 1.0);
}
