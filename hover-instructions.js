document.addEventListener('DOMContentLoaded', function() {
    // Create hover instructions container
    const hoverInstructions = document.createElement('div');
    hoverInstructions.id = 'hover-instructions';
    if(isMobile){
        hoverInstructions.innerHTML = `
        <p>⬆️ Drag to move</p> 
        <p>👆 Tap to jump</p>
        <p>🎋 Find the bamboo stalk to move to the next level</p>
        <p>🫧 Avoid bubble monsters, or jump on their heads to smush them!</p>
        <p>🔺 Each level brings more monsters / faster monsters</p>
        `;
    } else {
        hoverInstructions.innerHTML = `
        <p>⌨️ Move with arrow keys (or W/A/S/D)</p> 
        <p>🚀 Jump with spacebar</p>
        <p>🎋 Find the bamboo stalk to move to the next level</p>
        <p>🫧 Avoid bubble monsters, or jump on their heads to smush them!</p>
        <p>🔺 Each level brings more monsters / faster monsters</p>
        `;
    }

    document.body.appendChild(hoverInstructions);

    // Get the instructions button
    const instructionsButton = document.getElementById('instruction-button');
    
    if (instructionsButton) {
        // For desktop: Show on hover
        instructionsButton.addEventListener('mouseenter', function() {
            if (window.innerWidth > 768) { // Only on desktop
                hoverInstructions.style.display = 'block';
            }
        });
        
        instructionsButton.addEventListener('mouseleave', function() {
            if (window.innerWidth > 768) { // Only on desktop
                hoverInstructions.style.display = 'none';
            }
        });
        
        // For all devices: Toggle on click/tap
        instructionsButton.addEventListener('click', function() {
            if (hoverInstructions.style.display === 'block') {
                hoverInstructions.style.display = 'none';
            } else {
                hoverInstructions.style.display = 'block';
                
                // Auto-hide after 5 seconds on mobile
                if (window.innerWidth <= 768) {
                    setTimeout(function() {
                        hoverInstructions.style.display = 'none';
                    }, 5000);
                }
            }
        });
        
        // Close when clicking elsewhere on the page (mobile)
        document.addEventListener('click', function(event) {
            if (!hoverInstructions.contains(event.target) && event.target !== instructionsButton && window.innerWidth <= 768) {
                hoverInstructions.style.display = 'none';
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth <= 768) {
                // Ensure proper positioning on mobile
                hoverInstructions.style.left = '50%';
                hoverInstructions.style.transform = 'translateX(-50%)';
                hoverInstructions.style.right = 'auto';
            } else {
                // Reset to desktop positioning
                hoverInstructions.style.left = 'auto';
                hoverInstructions.style.transform = 'none';
                hoverInstructions.style.right = '10px';
            }
        });
    } else {
        console.error('Instruction button element not found!');
    }
});