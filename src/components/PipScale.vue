<script setup>
// Шкала из делений: клик ставит значение, повторный клик по последнему делению убавляет на одно.
const props = defineProps({
  modelValue: { type: Number, default: 0 },
  max: { type: Number, required: true },
  color: { type: String, default: '' },
  showValue: { type: Boolean, default: true },
  label: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

function pick(v) {
  emit('update:modelValue', v === props.modelValue ? v - 1 : v)
}
</script>

<template>
  <div class="scale">
    <div class="pips" :class="color" role="group" :aria-label="label || null">
      <button
        v-for="i in max"
        :key="i"
        type="button"
        class="pip"
        :class="{ on: i <= modelValue }"
        :aria-label="`${label ? label + ': ' : ''}${i}`"
        :aria-pressed="String(i <= modelValue)"
        @click="pick(i)"
      ></button>
    </div>
    <span v-if="showValue" class="val">{{ modelValue }}/{{ max }}</span>
  </div>
</template>

<style scoped>
.scale { display: flex; gap: 6px; align-items: center; }
</style>
