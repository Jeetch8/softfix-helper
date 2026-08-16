import re

filepath = 'frontend/src/components/TopicPage.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

match = re.search(r'(\s*<div className="mt-6 border-t border-gray-100 pt-6">\s*<div className="flex items-center justify-between mb-4">.*?)\s*</>', text, re.DOTALL)

if match:
    audio_section = match.group(1)
    # Remove from original place
    text = text.replace(audio_section, '')
    
    # The new Audio Generation block should start like this
    new_audio_block = """
        {/* Script Audio Generation Section */}
        {topic.narrationScript && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
""" + audio_section.replace('mt-6 border-t border-gray-100 pt-6', 'mt-0') + """
          </div>
        )}
"""

    # Insert it before the Recording Cues section
    target_str = """          </div>
        )}

        {/* Recording Cues Section */}"""
        
    replacement_str = "          </div>\n        )}\n" + new_audio_block + "\n        {/* Recording Cues Section */}"
    
    text = text.replace(target_str, replacement_str)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)
    print('Updated successfully')
else:
    print('Match not found')
