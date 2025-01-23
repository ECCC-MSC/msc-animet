import { ref } from 'vue'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import Draw, { createBox } from 'ol/interaction/Draw'
import Modify from 'ol/interaction/Modify'
import Snap from 'ol/interaction/Snap'
import Translate from 'ol/interaction/Translate'
import Select from 'ol/interaction/Select'
import { Collection } from 'ol'
import { never, click, pointerMove } from 'ol/events/condition'
import { Style, Stroke, Fill } from 'ol/style'
import { Point } from 'ol/geom'
import RegularShape from 'ol/style/RegularShape'
import { getCenter, getHeight, getWidth } from 'ol/extent.js'

export function useVectorShapes(mapObj) {
  const blockSelect = ref(false)
  const selectedFeature = ref(null)
  const activeFeatureIndex = ref(null)
  let interactionIndex = 0
  const interactions = ref({})

  const selectClick = new Select({
    condition: click,
    style: null,
  })
  const selectHover = new Select({
    condition: pointerMove,
    style: null,
  })

  function selectFeature(feature) {
    if (!blockSelect.value) {
      if (
        feature &&
        (!selectedFeature.value ||
          selectedFeature.value.ol_uid !== feature.ol_uid)
      ) {
        selectedFeature.value = feature
        if (selectedFeature.value) {
          Object.entries(interactions.value).forEach(([index, interaction]) => {
            if (interaction['feature'] === selectedFeature.value) {
              interaction['translate'].setActive(true)
              activeFeatureIndex.value = index
            } else {
              interaction['translate'].setActive(false)
            }
          })
        }
      }
    }
  }
  selectClick.on('select', (evt) => {
    const feature = evt.target
      .getFeatures()
      .getArray()?.[0]
      ?.get('features')?.[0]
    selectFeature(feature)
  })
  selectHover.on('select', (evt) => {
    const feature = evt.target
      .getFeatures()
      .getArray()?.[0]
      ?.get('features')?.[0]
    selectFeature(feature)
  })

  mapObj.addInteraction(selectClick)
  mapObj.addInteraction(selectHover)

  mapObj.on('click', function (evt) {
    mapObj.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
      if (feature && feature.getGeometry().getType() !== 'Point') {
        selectFeature(feature)
      }
    })
  })

  function resetFeatureStyle(id) {
    if (interactions.value[id] && interactions.value[id]['deleteAnimation']) {
      clearInterval(interactions.value[id]['deleteAnimation'].interval)
      interactions.value[id]['feature'].setStyle(
        interactions.value[id]['deleteAnimation'].originalStyle,
      )
      delete interactions.value[id]['deleteAnimation']
    }
  }

  function startDeleteAnimation(feature, id) {
    const originalStyle = feature.getStyle()
    let opacity = 1
    const animationInterval = setInterval(() => {
      opacity -= 0.1
      if (opacity <= 0.2) {
        clearInterval(animationInterval)
      }
      feature.setStyle(
        new Style({
          stroke: new Stroke({
            color: `rgba(255, 0, 0, ${opacity})`,
            width: 2,
          }),
        }),
      )
    }, 150)

    interactions.value[id]['deleteAnimation'] = {
      interval: animationInterval,
      originalStyle: originalStyle,
    }
  }

  function deleteFeature(id) {
    interactions.value[id]['source'].removeFeature(
      interactions.value[id]['feature'],
    )
    mapObj.removeInteraction(interactions.value[id]['modify'])
    mapObj.removeInteraction(interactions.value[id]['snap'])
    mapObj.removeInteraction(interactions.value[id]['translate'])

    document.removeEventListener(
      'keydown',
      interactions.value[id]['eventListeners'].keydown,
    )
    mapObj
      .getViewport()
      .removeEventListener(
        'touchstart',
        interactions.value[id]['eventListeners'].touchstart,
      )
    mapObj
      .getViewport()
      .removeEventListener(
        'touchend',
        interactions.value[id]['eventListeners'].touchend,
      )
    mapObj
      .getViewport()
      .removeEventListener(
        'touchmove',
        interactions.value[id]['eventListeners'].touchmove,
      )

    delete interactions.value[id]
  }

  function addDeleteFunctionality(id) {
    const handleKeyDown = (event) => {
      if (interactions.value[id]['feature'] === selectedFeature.value) {
        if (event.key === 'Delete') {
          deleteFeature(id)
        }
      }
    }

    let longPressTimer
    const longPressDuration = 1500
    const handleTouchStart = (event) => {
      if (event.touches.length === 1) {
        const feature = interactions.value[id]['feature']
        const pixel = mapObj.getEventPixel(event.touches[0])
        const featureAtPixel = mapObj.forEachFeatureAtPixel(pixel, (f) => f)

        if (
          featureAtPixel === feature ||
          featureAtPixel?.get('features')?.[0] === feature
        ) {
          startDeleteAnimation(feature, id)

          longPressTimer = setTimeout(() => {
            deleteFeature(id)
          }, longPressDuration)
        }
      }
    }

    const handleTouchEnd = () => {
      resetFeatureStyle(id)
      clearTimeout(longPressTimer)
    }

    const handleTouchMove = () => {
      resetFeatureStyle(id)
      clearTimeout(longPressTimer)
    }

    document.addEventListener('keydown', handleKeyDown)
    mapObj.getViewport().addEventListener('touchstart', handleTouchStart)
    mapObj.getViewport().addEventListener('touchend', handleTouchEnd)
    mapObj.getViewport().addEventListener('touchmove', handleTouchMove)

    interactions.value[id]['eventListeners'] = {
      keydown: handleKeyDown,
      touchstart: handleTouchStart,
      touchend: handleTouchEnd,
      touchmove: handleTouchMove,
    }
  }
  function addGeometry(
    layerStyle,
    name,
    drawParams,
    modifyParams,
    translateParams,
    orderedInteractions,
    modifyStart,
    modifyEnd,
  ) {
    blockSelect.value = true
    const source = new VectorSource()
    const vector = new VectorLayer({
      zIndex: 9999,
      source: source,
      style: layerStyle,
    })
    mapObj.addLayer(vector)

    const id = interactionIndex++
    const interaction = {
      name: name,
      source: source,
      feature: null,
      draw: null,
      snap: null,
      modify: null,
      translate: null,
    }
    interactions.value[id] = interaction

    interaction.draw = new Draw(drawParams(source))

    const cancelDrawing = (deleteInteraction) => {
      blockSelect.value = false
      mapObj.removeInteraction(interactions.value[id].draw)
      removeEventListeners()
      if (deleteInteraction) delete interactions.value[id]
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        cancelDrawing(true)
      }
    }

    const handleRightClick = (event) => {
      event.preventDefault()
      cancelDrawing(true)
    }

    const removeEventListeners = () => {
      document.removeEventListener('keydown', handleKeyDown)
      mapObj.getViewport().removeEventListener('contextmenu', handleRightClick)
    }

    document.addEventListener('keydown', handleKeyDown)
    mapObj.getViewport().addEventListener('contextmenu', handleRightClick)

    interaction.draw.on('drawend', (evt) => {
      cancelDrawing()

      interaction.feature = evt.feature
      interaction.modify = new Modify(modifyParams(source, interaction.feature))

      interaction.snap = new Snap({
        source: source,
        pixelTolerance: 0,
      })

      interaction.translate = new Translate(
        translateParams(interaction.feature),
      )

      interaction.translate.on('translatestart', () => {
        blockSelect.value = true
      })
      interaction.translate.on('translateend', () => {
        blockSelect.value = false
      })
      if (modifyStart) {
        interaction.modify.on('modifystart', modifyStart)
      }
      if (modifyEnd) {
        interaction.modify.on('modifyend', modifyEnd)
      }
      interaction.modify.on('modifystart', () => {
        blockSelect.value = true
      })
      interaction.modify.on('modifyend', () => {
        blockSelect.value = false
      })

      addDeleteFunctionality(id)

      for (const interactionName of orderedInteractions) {
        mapObj.addInteraction(interaction[interactionName])
      }
    })

    mapObj.addInteraction(interaction.draw)
  }
  function addArrow() {
    function arrowStyleFunction(feature) {
      const geometry = feature.getGeometry()
      const styles = [
        new Style({
          stroke: new Stroke({
            color: '#FF0000',
            width: 2,
          }),
        }),
      ]

      const start = geometry.getCoordinateAt(0)
      const end = geometry.getCoordinateAt(1)
      const dx = end[0] - start[0]
      const dy = end[1] - start[1]
      const rotation = Math.atan2(dy, dx)

      styles.push(
        new Style({
          geometry: new Point(end),
          image: new RegularShape({
            fill: new Fill({ color: '#FF0000' }),
            points: 3,
            radius: 8,
            rotation: -rotation,
            angle: Math.PI / 2,
          }),
        }),
      )

      return styles
    }
    function drawParams(source) {
      return {
        source: source,
        type: 'LineString',
        maxPoints: 2,
        stopClick: true,
      }
    }
    function modifyParams(source, feature) {
      return {
        source: source,
        features: new Collection([feature]),
        insertVertexCondition: never,
        pixelTolerance: 10,
      }
    }
    function translateParams(feature) {
      function isPixelEqual([x1, y1], [x2, y2], tolerance) {
        const dx = x2 - x1
        const dy = y2 - y1
        const distance = Math.sqrt(dx * dx + dy * dy)
        return distance <= tolerance
      }
      return {
        features: new Collection([feature]),
        hitTolerance: 10,
        condition: (event) => {
          const coordinate = mapObj.getPixelFromCoordinate(event.coordinate)
          const geometry = feature.getGeometry()
          const coordinates = geometry.getCoordinates()
          const startPixel = mapObj.getPixelFromCoordinate(coordinates[0])
          const endPixel = mapObj.getPixelFromCoordinate(
            coordinates[coordinates.length - 1],
          )
          return !(
            isPixelEqual(coordinate, startPixel, 10) ||
            isPixelEqual(coordinate, endPixel, 10)
          )
        },
      }
    }
    const orderedInteractions = ['modify', 'snap', 'translate']
    addGeometry(
      arrowStyleFunction,
      'Arrow',
      drawParams,
      modifyParams,
      translateParams,
      orderedInteractions,
    )
  }
  function calculateCenter(geometry) {
    let center, coordinates, minRadius
    const type = geometry.getType()
    if (type === 'Polygon') {
      let x = 0
      let y = 0
      let i = 0
      coordinates = geometry.getCoordinates()[0].slice(1)
      coordinates.forEach(function (coordinate) {
        x += coordinate[0]
        y += coordinate[1]
        i++
      })
      center = [x / i, y / i]
    } else if (type === 'LineString') {
      center = geometry.getCoordinateAt(0.5)
      coordinates = geometry.getCoordinates()
    } else {
      center = getCenter(geometry.getExtent())
    }
    let sqDistances
    if (coordinates) {
      sqDistances = coordinates.map(function (coordinate) {
        const dx = coordinate[0] - center[0]
        const dy = coordinate[1] - center[1]
        return dx * dx + dy * dy
      })
      minRadius = Math.sqrt(Math.max.apply(Math, sqDistances)) / 3
    } else {
      minRadius =
        Math.max(
          getWidth(geometry.getExtent()),
          getHeight(geometry.getExtent()),
        ) / 3
    }
    return {
      center: center,
      coordinates: coordinates,
      minRadius: minRadius,
      sqDistances: sqDistances,
    }
  }
  function addBox() {
    const style = new Style({
      geometry: function (feature) {
        const modifyGeometry = feature.get('modifyGeometry')
        return modifyGeometry ? modifyGeometry.geometry : feature.getGeometry()
      },
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0)',
      }),
      stroke: new Stroke({
        color: '#FF0000',
        width: 2,
      }),
    })
    function drawParams(source) {
      return {
        source: source,
        type: 'Circle',
        stopClick: true,
        geometryFunction: createBox(),
      }
    }
    function modifyParams(source, feature) {
      const defaultStyle = new Modify({ source: source })
        .getOverlay()
        .getStyleFunction()
      return {
        source: source,
        features: new Collection([feature]),
        deleteCondition: never,
        insertVertexCondition: never,
        pixelTolerance: 10,
        style: function (feature) {
          feature.get('features').forEach(function (modifyFeature) {
            const modifyGeometry = modifyFeature.get('modifyGeometry')
            if (modifyGeometry) {
              const point = feature.getGeometry().getCoordinates()
              let modifyPoint = modifyGeometry.point
              if (!modifyPoint) {
                // save the initial geometry and vertex position
                modifyPoint = point
                modifyGeometry.point = modifyPoint
                modifyGeometry.geometry0 = modifyGeometry.geometry
                // get anchor and minimum radius of vertices to be used
                const result = calculateCenter(modifyGeometry.geometry0)
                modifyGeometry.center = result.center
                modifyGeometry.minRadius = result.minRadius
              }

              const center = modifyGeometry.center
              const minRadius = modifyGeometry.minRadius
              let dx, dy
              dx = modifyPoint[0] - center[0]
              dy = modifyPoint[1] - center[1]
              const initialRadius = Math.sqrt(dx * dx + dy * dy)
              if (initialRadius > minRadius) {
                const initialAngle = Math.atan2(dy, dx)
                dx = point[0] - center[0]
                dy = point[1] - center[1]
                const currentRadius = Math.sqrt(dx * dx + dy * dy)
                if (currentRadius > 0) {
                  const currentAngle = Math.atan2(dy, dx)
                  const geometry = modifyGeometry.geometry0.clone()
                  geometry.scale(
                    currentRadius / initialRadius,
                    undefined,
                    center,
                  )
                  geometry.rotate(currentAngle - initialAngle, center)
                  modifyGeometry.geometry = geometry
                }
              }
            }
          })
          return defaultStyle(feature)
        },
      }
    }
    function translateParams(feature) {
      return {
        features: new Collection([feature]),
        hitTolerance: 10,
      }
    }
    const orderedInteractions = ['translate', 'modify', 'snap']
    const modifyStart = function (event) {
      event.features.forEach(function (feature) {
        feature.set(
          'modifyGeometry',
          { geometry: feature.getGeometry().clone() },
          true,
        )
      })
    }

    const modifyEnd = function (event) {
      event.features.forEach(function (feature) {
        const modifyGeometry = feature.get('modifyGeometry')
        if (modifyGeometry) {
          feature.setGeometry(modifyGeometry.geometry)
          feature.unset('modifyGeometry', true)
        }
      })
    }
    addGeometry(
      [style],
      'Rectangle',
      drawParams,
      modifyParams,
      translateParams,
      orderedInteractions,
      modifyStart,
      modifyEnd,
    )
  }

  function addCircle() {
    const style = {
      'fill-color': 'rgba(255, 255, 255, 0)',
      'stroke-color': '#FF0000',
      'stroke-width': 2,
    }
    function drawParams(source) {
      return {
        source: source,
        type: 'Circle',
        stopClick: true,
      }
    }
    function modifyParams(source, feature) {
      return {
        source: source,
        features: new Collection([feature]),
        pixelTolerance: 10,
      }
    }
    function translateParams(feature) {
      return {
        features: new Collection([feature]),
        hitTolerance: 10,
      }
    }
    const orderedInteractions = ['translate', 'modify', 'snap']
    addGeometry(
      style,
      'Circle',
      drawParams,
      modifyParams,
      translateParams,
      orderedInteractions,
    )
  }
  function addPolygon() {
    const style = {
      'fill-color': 'rgba(255, 255, 255, 0)',
      'stroke-color': '#FF0000',
      'stroke-width': 2,
    }
    function drawParams(source) {
      return {
        source: source,
        type: 'Polygon',
        stopClick: true,
      }
    }
    function modifyParams(source, feature) {
      return {
        source: source,
        features: new Collection([feature]),
        pixelTolerance: 10,
      }
    }
    function translateParams(feature) {
      return {
        features: new Collection([feature]),
        hitTolerance: 10,
      }
    }
    const orderedInteractions = ['translate', 'modify', 'snap']
    addGeometry(
      style,
      'Polygon',
      drawParams,
      modifyParams,
      translateParams,
      orderedInteractions,
    )
  }

  mapObj.getViewport().addEventListener('pointerdown', (evt) => {
    if (!blockSelect.value) {
      const pixel = mapObj.getEventPixel(evt)

      const feature = mapObj.forEachFeatureAtPixel(pixel, (feature) => feature)

      if (!feature && activeFeatureIndex.value) {
        selectedFeature.value = undefined
        const interaction = interactions.value[activeFeatureIndex.value]
        if (interaction && interaction['translate']) {
          interaction['translate'].setActive(false)
        }
        activeFeatureIndex.value = null
      }
    }
  })

  return {
    addArrow,
    addBox,
    addCircle,
    addPolygon,
    selectedFeature,
  }
}
