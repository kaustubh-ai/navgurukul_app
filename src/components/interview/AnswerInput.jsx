import { useState } from 'react'

export function AnswerInput({ disabled, onSubmit }) {
  const [value, setValue] = useState('')

  const submit = (event) => {
    event.preventDefault()
    if (!value.trim()) return
    onSubmit(value.trim())
    setValue('')
  }

  return (
    <section className="panel">
      <header className="panel-header">
        <h3>Answer</h3>
      </header>
      <form onSubmit={submit} className="answer-form">
        <textarea
          placeholder="Type your answer here..."
          value={value}
          onChange={(event) => setValue(event.target.value)}
          rows={4}
          disabled={disabled}
        />
        <button className="btn btn-primary" type="submit" disabled={disabled || !value.trim()}>
          Submit Answer
        </button>
      </form>
      <p className="muted small">If STT fails, typed answers keep the interview running.</p>
    </section>
  )
}
