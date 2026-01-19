import { useState, useCallback, useEffect } from 'react'

interface AsyncState<T> {
  status: 'idle' | 'pending' | 'success' | 'error'
  data: T | null
  error: Error | null
}

interface UseAsyncOptions {
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  immediate?: boolean
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  options: UseAsyncOptions = {}
) {
  const { onSuccess, onError, immediate = true } = options
  
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
  })

  const execute = useCallback(async () => {
    setState({ status: 'pending', data: null, error: null })
    try {
      const response = await asyncFunction()
      setState({ status: 'success', data: response, error: null })
      onSuccess?.(response)
      return response
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setState({ status: 'error', data: null, error: err })
      onError?.(err)
      throw err
    }
  }, [asyncFunction, onSuccess, onError])

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])

  return {
    ...state,
    execute,
    isLoading: state.status === 'pending',
    isError: state.status === 'error',
    isSuccess: state.status === 'success',
  }
}
