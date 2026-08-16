filepath = 'frontend/src/components/TopicPage.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

start_str = '                  <div className="mt-6 border-t border-gray-100 pt-6">\n                    <div className="flex items-center justify-between mb-4">'
end_str = '                  </div>\n                </>\n              )\n            )}\n          </div>\n        )}'

start_idx = text.find(start_str)
end_idx = text.find(end_str, start_idx)

if start_idx != -1 and end_idx != -1:
    audio_section = text[start_idx:end_idx]
    
    # Remove it from the original location
    text = text[:start_idx] + text[end_idx:]
    
    new_audio_block = """
        {/* Script Audio Generation Section */}
        {topic.narrationScript && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
""" + audio_section.replace('mt-6 border-t border-gray-100 pt-6', 'mt-0') + """          </div>
        )}
"""

    insertion_target = '        {/* Recording Cues Section */}'
    insertion_idx = text.find(insertion_target)
    
    if insertion_idx != -1:
        text = text[:insertion_idx] + new_audio_block + '\n' + text[insertion_idx:]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(text)
        print('Updated successfully')
    else:
        print('Insertion target not found')
else:
    print('Block not found')
