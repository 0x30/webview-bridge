import { defineComponent, type PropType } from 'vue'
import type { LogItem } from '../App'

export default defineComponent({
  name: 'EventMonitor',
  props: {
    logs: {
      type: Array as PropType<LogItem[]>,
      default: () => [],
    },
  },
  setup(props) {
    return () => (
      <div class="section">
        <div class="section-title">📋 事件日志</div>

        <div class="event-log">
          {props.logs.length === 0 ? (
            <div class="event-item">暂无日志...</div>
          ) : (
            props.logs.map((log, index) => (
              <div class={`event-item ${log.type}`} key={index}>
                <span style={{ color: '#999', marginRight: '8px' }}>{log.time}</span>
                {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    )
  },
})
