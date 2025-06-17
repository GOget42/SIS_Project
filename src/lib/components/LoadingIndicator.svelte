<script lang="ts">
        // Future enhancements could expose props for customization
</script>

<div class="loading-indicator">
	<div class="spinner"></div>
        <p>Loading...</p>
</div>

<style>
    .loading-indicator {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.8);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999; /* Ensures it appears above other content */
    }

    .spinner {
        border: 4px solid rgba(0, 0, 0, 0.1);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border-left-color: #09f; /* Beispiel Spinner-Farbe */
        animation: spin 1s ease infinite;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    .loading-indicator p {
        margin-top: 10px;
        font-size: 1rem;
        color: #333;
    }
</style>