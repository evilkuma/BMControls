
define(function(require) {

  function DefaultScene(element) {

    this.scene = new THREE.Scene
    this.scene.background = new THREE.Color(0x222222)

    this.camera = new THREE.PerspectiveCamera( 75, element.clientWidth/element.clientHeight, 0.1, 1000 )
    this.camera.position.set(0, 8, 0)
    this.camera.lookAt(this.scene.position)

    this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    this.renderer.setSize( element.clientWidth, element.clientHeight );
    element.appendChild( this.renderer.domElement );

    // --------------

    this.scene.add(new THREE.AmbientLight( 0x404040, 0.7 ))

    var light = new THREE.PointLight( 0xffffff, 0.7, 10 );
    light.position.set(0, 4, 0)
    this.scene.add( light );

    // --------------

    var animate = (function() {

      requestAnimationFrame( animate )

      this.renderer.render( this.scene, this.camera );

    }).bind(this)

    animate()

    window.addEventListener('resize', updateRendererSize.bind(this), false)

  }

  function updateRendererSize() {

    if(!this.renderer.domElement.parentElement) {

      console.error('cant calc size without parent dom element')
      return

    }

    if(this.camera) {

      const parentElement = this.renderer.domElement.parentElement
      const aspect = parentElement.clientWidth/parentElement.clientHeight
      const width = parentElement.clientWidth
      const height = parentElement.clientHeight

      this.renderer.setSize(width, height)
      this.camera.aspect = aspect

      if (this.camera.type === 'OrthographicCamera') {

        this.camera.left = -width
        this.camera.right = width
        this.camera.top = height
        this.camera.bottom = -height

      }

      this.camera.updateProjectionMatrix()
    }

  }

  return DefaultScene

})
