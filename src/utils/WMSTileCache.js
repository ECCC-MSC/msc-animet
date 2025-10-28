class WMSTileCache {
  constructor() {
    this.cache = new Map()
    this.pendingRequests = new Map()
  }

  _getLayerCache(layerName) {
    if (!this.cache.has(layerName)) {
      this.cache.set(layerName, new Map())
    }
    return this.cache.get(layerName)
  }

  has(layerName, url) {
    const layerCache = this.cache.get(layerName)
    return (layerCache && layerCache.has(url)) || this.pendingRequests.has(url)
  }

  get(layerName, url) {
    const layerCache = this.cache.get(layerName)
    return layerCache ? layerCache.get(url) || null : null
  }

  async preload(layerName, url) {
    const layerCache = this._getLayerCache(layerName)

    // Already cached
    if (layerCache.has(url)) {
      return Promise.resolve()
    }

    // Already fetching
    if (this.pendingRequests.has(url)) {
      return this.pendingRequests.get(url).promise
    }

    const abortController = new AbortController()

    const fetchPromise = fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      signal: abortController.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.blob()
      })
      .then((blob) => {
        layerCache.set(url, blob)
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          return
        }
        console.warn('Preload failed for:', url, error)
      })
      .finally(() => {
        this.pendingRequests.delete(url)
      })

    this.pendingRequests.set(url, {
      promise: fetchPromise,
      abortController,
      layerName,
    })
    return fetchPromise
  }

  clearLayer(layerName) {
    const layerCache = this.cache.get(layerName)
    if (layerCache) {
      layerCache.clear()
      this.cache.delete(layerName)
    }

    for (const [
      url,
      { abortController, layerName: requestLayer },
    ] of this.pendingRequests.entries()) {
      if (requestLayer === layerName) {
        abortController.abort()
        this.pendingRequests.delete(url)
      }
    }
  }

  deleteTile(layerName, dateSubstring) {
    if (!dateSubstring || typeof dateSubstring !== 'string') return false

    const layerCache = this.cache.get(layerName)
    let deleted = false
    if (layerCache) {
      const encoded = encodeURIComponent(dateSubstring)
      for (const key of Array.from(layerCache.keys())) {
        if (key.includes(dateSubstring) || key.includes(encoded)) {
          layerCache.delete(key)
          deleted = true
        }
      }
    }

    // Abort and remove pending requests that match the substring for this layer
    const encodedSub = encodeURIComponent(dateSubstring)
    for (const [url, pending] of this.pendingRequests.entries()) {
      if (
        pending.layerName === layerName &&
        (url.includes(dateSubstring) || url.includes(encodedSub))
      ) {
        try {
          pending.abortController.abort()
        } catch (e) {
          // ignore
        }
        this.pendingRequests.delete(url)
        deleted = true
      }
    }

    return deleted
  }

  clear() {
    this.abortPending()
    this.cache.clear()
  }

  abortPending() {
    for (const { abortController } of this.pendingRequests.values()) {
      abortController.abort()
    }
    this.pendingRequests.clear()
  }

  size() {
    let total = 0
    for (const layerCache of this.cache.values()) {
      total += layerCache.size
    }
    return total
  }

  layerSize(layerName) {
    const layerCache = this.cache.get(layerName)
    return layerCache ? layerCache.size : 0
  }

  estimateMemoryUsage() {
    let totalBytes = 0
    const layerStats = {}

    for (const [layerName, layerCache] of this.cache.entries()) {
      let layerBytes = 0
      for (const blob of layerCache.values()) {
        layerBytes += blob.size
      }
      totalBytes += layerBytes
      layerStats[layerName] = {
        bytes: layerBytes,
        mb: (layerBytes / 1024 / 1024).toFixed(2),
        tileCount: layerCache.size,
      }
    }

    return {
      totalBytes,
      totalMB: (totalBytes / 1024 / 1024).toFixed(2),
      tileCount: this.size(),
      byLayer: layerStats,
    }
  }

  pendingCount() {
    return this.pendingRequests.size
  }
}

export default WMSTileCache
