import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import type { SignupRequest } from 'Shared/Data/Types/index.js'
import { PageAction } from 'Client/Data/Constants.js'
import { Auth } from 'Client/Config/Api.js'
import { usePage } from 'Client/Contexts/Page/index.js'
import { useAuth } from 'Client/Contexts/Authentication/index.js'
import SignupForm from 'Client/Components/Form/Signup.js'

/**
 * Container component for handling user registration.
 *
 * @return The SignupContainer component.
 */
const SignupContainer: React.FC = () => {
	const navigate = useNavigate()

	const { dispatch } = usePage()
	const { isAuthenticated, login } = useAuth()

	/**
	 * Redirect to dashboard if already authenticated.
	 */
	useEffect(() => {
		if (isAuthenticated) {
			navigate('/dashboard', { replace: true })
		}
	}, [isAuthenticated, navigate])

	/**
	 * Handle user registration.
	 *
	 * @param credentials - The signup credentials.
	 */
	const handleSignup = async (credentials: SignupRequest) => {
		dispatch({ type: PageAction.SetLoading, payload: true })
		dispatch({
			type: PageAction.SetPageTitle,
			payload: 'Creating Account...',
		})

		try {
			const response = await Auth.signup(credentials)
			const responseData = response.data

			// Handle successful registration
			if (responseData.success) {
				login(responseData)

				// Dispatch a success notification
				dispatch({
					type: PageAction.AddNotification,
					payload: {
						id: `signup-success-${Date.now()}`,
						message:
							'Registration successful! Redirecting to dashboard...',
						type: 'success',
					},
				})
			} else if (response.error) {
				throw new Error(response.error)
			}
		} catch (err: Error | unknown) {
			const errorId = `err-${Date.now()}`

			// Dispatch an error notification
			dispatch({
				type: PageAction.AddNotification,
				payload: {
					id: errorId,
					message:
						typeof err === 'object' &&
						err != null &&
						'message' in err
							? (err as Error).message
							: 'Registration failed. Please try again.',
					type: 'error',
				},
			})

			// Auto-remove notification after 5 seconds
			setTimeout(
				() =>
					dispatch({
						type: PageAction.RemoveNotification,
						payload: errorId,
					}),
				5000
			)
		} finally {
			dispatch({ type: PageAction.SetLoading, payload: false })
			dispatch({ type: PageAction.SetPageTitle, payload: 'Sign Up' })
		}
	}

	return <SignupForm onSignup={handleSignup} />
}

export default SignupContainer
