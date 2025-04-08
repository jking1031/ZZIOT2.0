// 自定义事件发射器，用于替代react-native-event-listeners
class EventEmitter {
  constructor() {
    this.events = {};
    this.lastListenerId = 0;
  }

  // 添加事件监听器
  addEventListener(eventName, listener) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    
    const id = ++this.lastListenerId;
    this.events[eventName].push({
      id,
      listener
    });
    
    return id;
  }

  // 一次性事件监听器
  once(eventName, listener) {
    const id = this.addEventListener(eventName, (...args) => {
      this.removeEventListener(id);
      listener(...args);
    });
    return id;
  }

  // 移除特定事件监听器
  removeEventListener(listenerId) {
    Object.keys(this.events).forEach(eventName => {
      const eventListeners = this.events[eventName];
      const index = eventListeners.findIndex(item => item.id === listenerId);
      
      if (index !== -1) {
        eventListeners.splice(index, 1);
        
        if (eventListeners.length === 0) {
          delete this.events[eventName];
        }
      }
    });
  }

  // 移除指定事件的所有监听器
  removeAllListeners(eventName) {
    if (eventName && this.events[eventName]) {
      delete this.events[eventName];
    } else if (!eventName) {
      this.events = {};
    }
  }

  // 触发事件
  emit(eventName, ...args) {
    const eventListeners = this.events[eventName];
    
    if (eventListeners) {
      eventListeners.forEach(({ listener }) => {
        listener(...args);
      });
      return true;
    }
    
    return false;
  }
}

// 创建单例实例
const EventRegister = new EventEmitter();

export { EventRegister }; 