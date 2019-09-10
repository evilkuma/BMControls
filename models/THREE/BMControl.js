
define(function(require) {

  var Room = require('./Room')
  var raycaster = new THREE.Raycaster
  var ray = new THREE.Ray

  function BMControl({ scene, points = [], dom = document.body, ocontrol } = {}) {

    this.room = new Room(points)
    this.objects = []
    this.events = {}
    this.obj = null
    this.move = false
    this.mouse = new THREE.Vector2
    this.scene = scene
    this.ocontrol = ocontrol

    var events = {
      mouseMove: mouseMove.bind(this),
      mouseDown: mouseDown.bind(this),
      mouseUp: mouseUp.bind(this)
    }

    this.enable = function(bool) {

      var func = bool ? 'addEventListener' : 'removeEventListener'

      dom[func]('mousemove', events.mouseMove)
      dom[func]('mousedown', events.mouseDown)
      dom[func]('mouseup', events.mouseUp)

      return this

    }

    this.enable(true)

    /**
     * если кнопка мыши была поднята в течении
     * некоторого времени, то выделяем обьект,
     * иначе работает orbit
     */
    this.moveTimeout = null

  }

  /**
   * Проверяет пересечение и расчитывает допустимое положение объкта по отношению
   * к плэйну.
   * 
   * @param {CubeMesh} obj - проверяемый объект 
   * @param {Wall} p - проверяемый плэйн 
   * @param {Vector3} point - позиция передвижения 
   * 
   * @returns { point: [ x, z ] } || false
   */
  function getFixedPos(obj, p, point) {

    // ищем проецкию позицию передвижения на плэйн
    ray.set(point, p.rvec.clone().multiplyScalar(-1))
    var pos = ray.intersectPlane(p, new THREE.Vector3)
    
    if(pos) {
      // проверяем вхождение точки в зону действия плэйна
      // когда мышь в пределах комнаты
      if( (pos.x > p.max.x || pos.x < p.min.x) || (pos.z > p.max.z || pos.z < p.min.z) ) 
        return false

    } else {

      // когда мышь за пределами комнаты
      var angle = p.point1.angleTo(p.point2) - p.point1.angleTo(point) - p.point2.angleTo(point)

      if(+angle.toFixed(10) < 0) return false

    }
  
    // ищем предельеные точки объекта, которые выходят за пределы плэйна
    var points = obj.toRectY().map(p => new THREE.Vector3(p[0], 0, p[1]))
    var isOver = false
    var over_poses = points.map(pt => {
  
      ray.set(pt, p.rvec)
      var res = ray.intersectPlane(p, new THREE.Vector3)
      if(res) isOver = true
  
      return res
  
    })
  
    // если нет точки вышелшей за пределы - все ок
    if(!isOver) return false
  
    // находим точку дальше всего выходящую за пределы плэйна
    var idx, distance = 0
    for(let i = 0; i < over_poses.length; i++) {
  
      if(!over_poses[i]) continue
  
      var ndist = over_poses[i].distanceTo(points[i])
      if(ndist >= distance) {
        distance = ndist
        idx = i
      }
  
    }
  
    // подсчитываем допустимые координаты
    var nx = point.x - (points[idx].x - over_poses[idx].x)
    var nz = point.z - (points[idx].z - over_poses[idx].z)
  
    return {
      point: [nx, nz]
    }

  }

  function moveSelected() {
    // настраиваем кастер и пуляем луч в мэш пола
    raycaster.setFromCamera( this.mouse, this.scene.camera )
    var intersect = raycaster.ray.intersectPlane( this.room._plane, new THREE.Vector3 )

    // если мимо ничего не делаем
    if(!intersect) return

    // сразу перемещаем конструкцию в место мышки
    this.obj.position.x = intersect.x
    this.obj.position.z = intersect.z

    // ищем первое пересчение и записываем о нем инфу
    var info = null, p

    for(p of this.room._walls) {
      
      info = getFixedPos(this.obj, p, intersect)

      if(info) break
  
    }

    // пересечений нет - значит все ок
    if(!info) return

    // по полученным данным смещаем инфу о курсоре и сам объект в допустимые координаты
    intersect.x = info.point[0]
    intersect.z = info.point[1]
    this.obj.position.x = info.point[0]
    this.obj.position.z = info.point[1]

    // ищем второе пересчение и записываем о нем инфу
    var info1 = null, p1

    for(p1 of this.room._walls) {
      // исключаем из поиска исправленое пересечение
      if(p1 === p) continue
  
      info1 = getFixedPos(this.obj, p1, intersect)
  
      if(info1) break
  
    }

    // пересечений нет - значит все ок
    if(!info1) return
  
    // пересчитываем полученные допустимые координаты с учетом первой проверки
    var vec1 = p.rvec.clone().applyEuler(new THREE.Euler(0, Math.PI/2, 0)).toFixed(10)
    var vec2 = p1.rvec.clone().applyEuler(new THREE.Euler(0, Math.PI/2, 0)).toFixed(10)
  
    var f11 = new THREE.Vector3(info.point[0], 0, info.point[1])
    var f12 = f11.clone().add(vec1.clone().multiplyScalar(10))
    var f21 = new THREE.Vector3(info1.point[0], 0, info1.point[1])
    var f22 = f21.clone().add(vec2.clone().multiplyScalar(10))
  
    var K1 = (f12.z - f11.z)/(f12.x - f11.x)
    var K2 = (f22.z - f21.z)/(f22.x - f21.x)
  
    var B1 = (f12.x*f11.z - f11.x*f12.z)/(f12.x - f11.x)
    var B2 = (f22.x*f21.z - f21.x*f22.z)/(f22.x - f21.x)
  
    var x, y
  
    // условие для обработки стен, который направлены по оси Z
    if((p.rot + Math.PI) % Math.PI === Math.PI/2) {
  
      x = info.point[0]
      y = K2*x+B2
  
    } else if((p1.rot + Math.PI) % Math.PI === Math.PI/2) {
  
      x = info1.point[0]
      y = K1*x+B1
  
    } else {
  
      x = (B2 - B1)/(K1 - K2)
      y = K1*x+B1
  
    }
  
    this.obj.position.x = x
    this.obj.position.z = y

  }

  function findObject() {

    raycaster.setFromCamera( this.mouse, this.scene.camera ) 
    var intersects = raycaster.intersectObjects( this.objects )

    if(intersects.length) 
      return intersects[0]

    return false

  }

  function mouseMove(e) {

    this.mouse.x = (e.clientX / window.innerWidth ) * 2 - 1
    this.mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

    if(this.obj) {

      if(!this.move) return

      moveSelected.bind(this)()

    } else {

      var obj = findObject.bind(this)()
      
      if(this.events.onview)
        this.events.onview(obj, this.objects)

    }

  }

  function selectedObject(obj) {

    if(this.ocontrol && this.ocontrol.enabled) {

      this.ocontrol.enabled = false
      
    }

    this.obj = obj.object

    if(this.events.onselected)
      this.events.onselected(obj, this.objects)

  }

  function mouseDown(e) {

    this.move = true

    this.mouse.x = (e.clientX / window.innerWidth ) * 2 - 1
    this.mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
    
    var obj = findObject.bind(this)()

    if(obj) { 

      this.moveTimeout = [
        obj,
        setTimeout((function() {

          this.moveTimeout = null
  
        }).bind(this), 200)
      ]

    } else if(this.obj) {

      if(this.ocontrol && this.ocontrol.setRotateStart) {
        this.ocontrol.setRotateStart(new THREE.Vector2(e.clientX, e.clientY))
      }

      if(this.events.onunselected)
        this.events.onunselected(this.obj, this.objects)

      this.obj = null

      if(this.ocontrol && !this.ocontrol.enabled) {

        this.ocontrol.enabled = true
        
      }

    }

  }

  function mouseUp(e) {

    this.move = false

    if(this.moveTimeout) {
      
      clearTimeout(this.moveTimeout[1])
      selectedObject.bind(this)(this.moveTimeout[0])
      this.moveTimeout = null

    }

  }

  return BMControl

})
