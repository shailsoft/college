using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using College.Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace College.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class AuthController : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var adminEmail = Environment.GetEnvironmentVariable("ADMIN_EMAIL");
        var adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD");

        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrEmpty(adminPassword))
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "Admin account is not configured" });

        var emailMatches = string.Equals(request.Email?.Trim(), adminEmail, StringComparison.OrdinalIgnoreCase);
        var passwordMatches = SecureEquals(request.Password ?? string.Empty, adminPassword);
        if (!emailMatches || !passwordMatches)
            return Unauthorized(new { error = "Invalid credentials" });

        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.Name, adminEmail), new Claim(ClaimTypes.Role, "admin")],
            CookieAuthenticationDefaults.AuthenticationScheme);

        await HttpContext.SignInAsync(new ClaimsPrincipal(identity));
        return Ok(new { email = adminEmail, role = "admin" });
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me() => Ok(new { email = User.Identity!.Name, role = "admin" });

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync();
        return Ok(new { ok = true });
    }

    private static bool SecureEquals(string candidate, string expected)
    {
        var candidateHash = SHA256.HashData(Encoding.UTF8.GetBytes(candidate));
        var expectedHash = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        return CryptographicOperations.FixedTimeEquals(candidateHash, expectedHash);
    }
}
